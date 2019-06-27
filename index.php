<?php
if(isset($_REQUEST)) {
    // Корневая директория (для каждого пользователя использовать свою директорию)
    $base = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'root';
    // Получение канонизированного абсолютного пути
    // (раскрывая все символические ссылки, переходы типа '/./', '/../' и лишние символы '/' в пути)
    function path($id){
        global $base;
        $id = utf2win($id);
        $id = str_replace('/', DIRECTORY_SEPARATOR, $id);
        $id = trim($id, DIRECTORY_SEPARATOR);
        $path = realpath($base . DIRECTORY_SEPARATOR . $id);
        if(!$path) { throw new Exception('Path does not exist'); }
        if($base && strlen($base)) {
            if(strpos($path, $base) !== 0) { throw new Exception('Path is not inside base'); }
        }
        return $path;
    }
    // Получение пути относительно корневой директории 'root'
    function get_id($path) {
        global $base;
        $path = substr($path, strlen($base));
        $path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
        $path = trim($path, '/');
        return strlen($path) ? $path : '/';
    }
    // Получение содержимого директории ($flags не указан, возврат тлько директорий)
    function get_nodes($id, $flags = 0){
        $id = path($id);
        $res = array();
        foreach(glob($id . DIRECTORY_SEPARATOR . '*', $flags) as $item) {
            if(!$flags){
                if(is_dir($item)) {
                    $res[] = array( 'name' => win2utf(pathinfo($item, PATHINFO_BASENAME)),
                                    'id' => win2utf(get_id($item)),
                                    'date' => date("d.m.Y",filectime($item)),
                                    'type' => 'folder');
                }
                else {
                    $res[] = array( 'name' => win2utf(pathinfo($item, PATHINFO_FILENAME)),
                                    'id' => win2utf(get_id($item)),
                                    'type' => 'file',
                                    'date' => date("d.m.Y",filectime($item)),
                                    'size' => filesize($item),
                                    'icon' => pathinfo($item, PATHINFO_EXTENSION));
                }
            }
            else{
                $res[] = array( 'name' => win2utf(substr(strrchr($item, DIRECTORY_SEPARATOR), 1)),
                                'id' => win2utf(get_id($item)),
                                'children' => glob($item . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR) ? true : false);
            }
        }
        return $res;
    }
    // Удаление элементов
    function remove($data) {
        if(!$data){
            return array('status' => 'OK');
            //throw new Exception("No data");
        }
        global $base;
        foreach (json_decode($data) as $item) {
            if (!$item->id) {
                throw new Exception('Path does not exist');
            }
            $id = path($item->id);
            if ($id === $base) {
                throw new Exception('Cannot remove root');
            }
            remove_all($id);
        }
        return array('status' => 'OK');
    }
    // Рекурсивный обход и удаление элементов
    function remove_all($id){
        // Удалить содержимое папки, затем папку
        if(is_dir($id)) {
            foreach(glob($id . DIRECTORY_SEPARATOR . '*', GLOB_NOSORT) as $item) {
                remove_all($item);
            }
            rmdir($id);
        }
        // Удалить файл
        if(is_file($id)) {
            unlink($id);
        }
    }
    // Перемещение файлов и папок
    function move($contents, $parent){
        $parent = path($parent);
        foreach (json_decode($contents) as $item){
            $id = path($item->id);
            $name = pathinfo($id, PATHINFO_BASENAME);
            $newName = $parent . DIRECTORY_SEPARATOR . $name;
            if(is_dir($id)){
                if(file_exists($newName)){
                    throw new Exception("Folder ".$name." already exists in the current directory");
                }
                if(!rename($id, $newName)){
                    throw new Exception("Unable to move the folder ".$name);
                }
            }
            else{
                if(file_exists($newName)){
                    throw new Exception("File ".$name." already exists in the current directory");
                }
                if(!rename($id, $newName)){
                    throw new Exception("Unable to move the file ".$name);
                }
            }
        }
        return array('status' => 'OK');
    }
    // Переименование файла или папки
    function rename_path($id, $name){
        global $base;
        $id = path($id);
        if($id === $base) {
            throw new Exception('Cannot rename root');
        }
        // Валидация имеи
        if(preg_match('/([\/?:*?<>|"\\\\]+)/ui', $name) || !strlen($name)) {
            throw new Exception('Invalid name: ' . $name);
        }
        $newName = dirname($id) . DIRECTORY_SEPARATOR . $name;
        // Переименовать папку
        if(is_dir($id)){
            if(file_exists($newName)){
                throw new Exception("Folder ".$name." already exists in the current directory");
            }
            if(!rename($id, $newName)){
                throw new Exception("Could not rename folder: ".pathinfo($id, PATHINFO_BASENAME));
            }
        }
        // Добавить раширение файла и переименовать
        else if(is_file($id)){
            $extension = pathinfo($id, PATHINFO_EXTENSION);
            $extension = strlen($extension) ? ".".$extension : "";
            if(file_exists($newName.$extension)){
                throw new Exception("File ".$name." already exists in the current directory");
            }
            if(!rename($id, $newName.$extension)){
                throw new Exception("Could not rename file: ".pathinfo($id, PATHINFO_BASENAME));
            }
        }
        return array('status' => 'OK');
    }
    // Если ОС Windows, преобразование кодировки
    function win2utf($str){
        // Если версия сервера ниже 7 "realpath" кирилицу принимает и возвращает в кодировке windows-1251
        $phpVer = phpversion();
        if((int)$phpVer[0] < 7 && PHP_OS == "WINNT" /*get_encoding($str) == "windows-1251"*/){
            return iconv ( "windows-1251" , "UTF-8", $str );
        }
        return $str;
    }
    // Если присутствует кирилица, преобразование кодировки
    function utf2win($str){
        // Если версия сервера ниже 7 "realpath" кирилицу принимает и возвращает в кодировке windows-1251
        $phpVer = phpversion();
        if((int)$phpVer[0] < 7 && PHP_OS == "WINNT" && preg_match('([а-я]+)ui', $str)){
            return iconv ( "UTF-8" , "windows-1251", $str );
        }
        return $str;
    }
    // Получение текущей кодировки (mb_detect_encoding работает не корректно)
    // !!! в xampp при испольозовании этой функции в строку ответа добавляются результаты функции md5 в результате возникает ошибка "parsererror"
    function get_encoding($str){
        $cp_list = array("utf-8", "windows-1251");
        foreach ($cp_list as $k=>$encoding){
            if (md5($str) === md5(iconv($encoding, $encoding, $str))){
                return $encoding;
            }
        }
        return null;
    }
    // Создание папки
    function create($content, $parent){
        $parent = path($parent);
        // Валидация имени
        if(preg_match('/([\/?:*?<>|"\\\\]+)/ui', $content) || !strlen($content)) {
            throw new Exception('Invalid name: ' . $content);
        }
        $content = utf2win($content);
        $name = $parent . DIRECTORY_SEPARATOR . $content;
        if(!mkdir($name)){
            throw new Exception("Failed to create a folder named: ".$name);
        }
        return array('status' => 'OK',
                        'name' => win2utf(pathinfo($name, PATHINFO_BASENAME)),
                        'id' => win2utf(get_id($name)),
                        'date' => date("d.m.Y",filectime($name)));
    }

    // Загрузка файлов на сервер
    function upload_files($files, $parent){
        if($files) {
            $parent = path($parent);
            $errors = array();
            $error = false;
            foreach ($files["error"] as $key => $error) {
                // Если файл успешно загружен на сервер
                if ($error == UPLOAD_ERR_OK && is_uploaded_file($files["tmp_name"][$key])) {
                    $tmp_name = $files["tmp_name"][$key];
                    $name = $files["name"][$key];
                    $newName = $parent . DIRECTORY_SEPARATOR . $name;
                    // Если файл существует
                    if (file_exists($newName)) {
                        $error = true;
                        $errors[] = array("exists" => $files["name"][$key]);
                    }
                    // Перемещение загруженного файла в текущую директорию
                    else if (!move_uploaded_file($tmp_name, $newName)) {
                        $error = true;
                        $errors[] = array("save" => $files["name"][$key]);
                    }
                }
                // Если превышен размер файла указанный в php.ini или значение MAX_FILE_SIZE в html-форме
                else if ($error == UPLOAD_ERR_INI_SIZE || $error == UPLOAD_ERR_FORM_SIZE) {
                    $error = true;
                    $errors[] = array("size" => $files["name"][$key]);
                }
                // Если файл не загружен или загружен частично
                else if ($error == UPLOAD_ERR_PARTIAL || $error == UPLOAD_ERR_NO_FILE) {
                    $error = true;
                    $errors[] = array("upload" => $files["name"][$key]);
                }
            }
            if ($error) {
                return array("status" => "Error", "files" => $errors);
            }
            return array("status" => "OK");
        }
        return array("status" => "Not upload Files");

    }
    // Обработка операций
    if (isset($_GET["operation"])) {
        try {
            $result = null;
            switch ($_GET["operation"]) {
                // Получение директорий указанной директории
                case "get_node" :
                    $node = isset($_GET["id"]) && $_GET["id"] !== '#' ? $_GET["id"] : '/';
                    $result = get_nodes($node, GLOB_ONLYDIR);
                    break;
                // Получение содержимого текущей директории
                case 'get_contents' :
                    $node = isset($_GET['id']) && $_GET['id'] !== '#' ? $_GET['id'] : '/';
                    $result = get_nodes($node);
                    break;
                // Удаление контента
                case 'remove_contents':
                    $contents = isset($_GET['items']) && $_GET['items'] !== '[{}]' ? $_GET['items'] : false;
                    $result = remove($contents);
                    break;
                // Перемещение контентка
                case 'move_contents':
                    $contents = isset($_GET['items']) && $_GET['items'] !== '[{}]' ? $_GET['items'] : false;
                    $parent = isset($_GET['parent']) && $_GET['parent'] !== '#' ? $_GET['parent'] : '/';
                    $result = move($contents, $parent);
                    break;
                // Переименование директории или файла
                case 'rename_content':
                    $content = isset($_GET['id']) && $_GET['id'] !== '#' ? $_GET['id'] : '/';
                    $result = rename_path($content, isset($_GET['newName']) ? $_GET['newName'] : '');
                    break;
                // Создание директории
                case 'create_content':
                    $content = isset($_GET['id']) && $_GET['id'] !== '#' ? $_GET['id'] : '/';
                    $parent = isset($_GET['parent']) && $_GET['parent'] !== '#' ? $_GET['parent'] : '/';
                    $result = create($content, $parent);
                    break;
                // Загрузка файлов на сервер
                case 'upload_files':
                    if(intval($_SERVER['CONTENT_LENGTH']) > 0 && count($_POST) === 0){
                        throw new Exception('PHP discarded POST data because of request exceeding post_max_size.');
                    }
                    $parent = isset($_POST['upload_folder']) && $_POST['upload_folder'] !== '#' ? $_POST['upload_folder'] : '/';
                    $files = isset($_FILES['files']) && $_FILES['files'] !== '[{}]' ? $_FILES['files'] : false;
                    $result = upload_files($files, $parent);
                    break;
                default:
                    throw new Exception('Unsupported operation: ' . $_GET['operation']);
                    break;
            }
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            header($_SERVER["SERVER_PROTOCOL"] . ' 500 Server Error');
            header('Status:  500 Server Error');
        }
        exit();
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="css/style.css">
    <!--<link rel="stylesheet" href="css/style.jsTree.css">-->
    <script type="text/javascript" src="js/jquery-3.1.1.min.js"></script>
    <script type="text/javascript" src="js/jquery-ui.min.js"></script>
    <link rel="stylesheet" href="css/jquery-ui.min.css">
    <script type="text/javascript" src="js/jquery.autosize.input.min.js"></script>
    <title>File Manager</title>
</head>
<body>
<div id="dialog"></div>
<div id="container">
    <table>
        <tr>
            <td id="tree" class="jstree"></td>
            <td id="splitter"></td>
            <td>
                <table>
                    <tbody>
                    <tr>
                        <td>
                            <button id="loadBtn">Загрузить файл</button>
                            <button id="createBtn">Создать папку</button>
                            <button id="renameBtn" disabled>Переименовать</button>
                            <button id="removeBtn" disabled>Удалить</button>
                            <button id="moveBtn" disabled>Переместить</button>
                            <button id="pasteBtn" disabled>Вставить</button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span>Текущая директория </span>
                            <span id="currentDir"></span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span id="massageMenu"></span>
                        </td>
                    </tr>
                    </tbody>
                </table>
                <table id="data"></table>
            </td>
        </tr>
    </table>
</div>
<script type="text/javascript" src="js/script.js"></script>
</body>
</html>