$(document).ready(function() {
    var moveElement, moveNameElement, oldFolder, isMove = false,isRename = false;
    // Загрузка папок в обозреватель
    if ($("#tree")[0].children.length == 0) {
        var el = $("#tree");
        $(el).append("<ul class='jstree-children jstree-container-ul'>" + get_html_hode("/", "Loading ...", "jstree-last", " ") + "</ul>");
        $(el).find(".jstree-node").addClass("jstree-loading");
        $("#currentDir").text("/");
        load_children_nodes($(el).find(".jstree-node").data("id"), true);
    }
    // HTML узел
    function get_html_hode(id, name, tree, icon) {
        return "<li class='jstree-node " + tree + "' data-id='" + id + "'>" +
            "<i class='jstree-icon'></i><" + "a class='jstree-anchor' href='#'>" + (icon || "<i class='jstree-icon folder'></i>") + name + "</a></li>";
    }
    // Загрузка содержимого папки с сервера
    function load_children_nodes(id, open = false) {
        //if (typeof(open)==='undefined') open = false;
        $.get("?operation=get_node", {"id": id})
            .done(function (data) {
                // Добавление папок в узел
                if (data) {
                    var el = $("#tree [data-id='" + id + "']");
                    // Если папка не содержит содержимого
                    if (data.length != 0) {
                        var children = "";
                        // Создание узлов
                        for (var i = 0; i < data.length; i++) {
                            // Если узел последний
                            if (i == data.length - 1) {
                                children += get_html_hode(data[i].id, data[i].name, data[i].children ? "jstree-closed jstree-last" : "jstree-leaf jstree-last");
                            }
                            else {
                                children += get_html_hode(data[i].id, data[i].name, data[i].children ? "jstree-closed" : "jstree-leaf");
                            }
                        }
                        // Если корневой элемент (применить стиль для root)
                        if ($(el).parent(".jstree-container-ul").length != 0) {
                            $(el).find(".jstree-anchor")[0].innerHTML = "<i class='jstree-icon folder'></i>root";
                            $(el).find(".jstree-anchor").addClass("jstree-disabled");
                        }
                        $(el).append("<" + "ul class='jstree-children' style='display: none;'>" + children + "</ul>");
                        $(el).removeClass("jstree-loading");
                        if (open) {
                            $(el).children("ul").show(300);
                            $(el).addClass("jstree-open");
                            //open(el);
                        }
                        else{
                            $(el).addClass("jstree-closed");
                        }
                    }
                    else {
                        $(el).removeClass("jstree-loading").addClass("jstree-leaf");
                    }
                }
            })
            .fail(function () {
                //add_nodea(false);
            });
    }
    // Клик по узлу
    $(".jstree").on("click", ".jstree-closed > .jstree-icon, .jstree-open > .jstree-icon", function () {
        var el = $(this).parent();
        // Закрытие узла
        if ($(el).hasClass("jstree-open")) {
            $(el).children("ul").hide(300);
            $(el).removeClass("jstree-open").addClass("jstree-closed");
        }
        else if ($(el).hasClass("jstree-closed")) {
            // Открытие узла
            if (el.is(":has(ul)")) {
                $(el).children("ul").show(300);
                $(el).removeClass("jstree-closed").addClass("jstree-open");
            }
            else {
                // Загрузка содержимого узла
                $(el).removeClass("jstree-closed").addClass("jstree-loading");
                load_children_nodes($(el).data("id"), true);
            }
        }
    });
    // Клик по папке в обозревателе
    $(".jstree").on("click", ".jstree-node > a", function (e) {
        // Выделить текущую папку
        $(".jstree a").removeClass("jstree-clicked");
        $(this).addClass("jstree-clicked");
        // Вывод информации о текущей папке
        $("#currentDir").text($($(this).parent()).data("id"));
        // Загрузка содержимого текущей папки
        get_contents($($(this).parent()).data("id"));
        // Пока не выделена ни одноа строка кнопка переименовать, удалить и переместить не активаны
        $("#renameBtn").attr('disabled', true);
        $("#removeBtn").attr('disabled', true);
        $("#moveBtn").attr('disabled', true);
        e.preventDefault();
    });
    // Загрузка содержимого папки и создание списка файлов и папок
    function get_contents(id) {
        $.get("?operation=get_contents", {"id": id}, function (data) {
            if (data) {
                if (data.length != 0) {
                    var contentsFolder = "";
                    var contentsFile = "";
                    data.forEach(function (item) {
                        if (item.type == "folder") {
                            // Создание списка папок
                            contentsFolder += get_html_folder(item.id, item.name, item.date);
                        }
                        else if (item.type == "file") {
                            // Создание списка файлов
                            contentsFile += get_html_file(item.id, item.name, item.icon, item.date, human_filesize(item.size));
                        }
                    });
                    if (contentsFolder) {
                        // Таблица папок
                        contentsFolder = "<tbody id='folders'><tr class='header-table'><td><nobr><span>Имя</span></nobr></td><td><nobr><span>Дата" +
                            "</span></nobr><td><nobr><span></span></nobr></td><td colspan='50'>&nbsp;</td></tr>" + contentsFolder + "</tbody>";
                    }
                    if (contentsFile) {
                        // Таблица файлов
                        contentsFile = "<tbody id='files'><tr class='header-table'><td><nobr><span>Имя</span></nobr></td><td><nobr><span>Дата</span></nobr></td>" +
                            "<td><nobr><span>Размер</span></nobr></td><td><nobr><span>Тип</span></nobr></td><td colspan='50'>&nbsp;</td></tr>" + contentsFile +
                            "</tbody>";
                    }
                    $("#data").html(contentsFolder + contentsFile );
                }
                else{
                    $("#data").html("");
                }
            }
        });
    }
    function human_filesize(bytes){
        if(!bytes){
            return 0;
        }
        var sz = ' KMGTP';
        var factor = Math.floor((Math.ceil(Math.log10(bytes)) - 1) / 3);
        if(factor == 0){
            return bytes + "b"
        }
        return ( bytes / Math.pow(1024, factor)).toFixed(2) + sz[factor] + "b";
    }
    // Строка папки
    function get_html_folder(id, name, date) {
        return "<tr data-id='" + id + "'><td><nobr><i class='jstree-icon folder'></i><span>" + name + "</span></nobr></td>" +
            "<td><nobr><span>" + date + "</span></nobr></td><td colspan='50'>&nbsp;</td></tr>";
    }
    // Строка файла
    function get_html_file(id, name, icon, date, size) {
        return "<tr data-id='" + id + "'><td><nobr><i class='jstree-icon file file-" + icon + "'></i><span>" + name + "</span></nobr></td><td><nobr><span>"+
            date + "</span></nobr></td><td><nobr><span>" + size + "</span></nobr></td><td colspan='50'><nobr><span>" + icon + "</span></nobr></td></tr>";
    }

    // Выделение элементов списка
    $("#data").on("click", "tr", function (e) {
        // Не менять цыет строки при клике в поле ввода текста
        if(isRename){
            return;
        }
        // Клавиша ctrl не нажата
        if (!e.ctrlKey) {
            $("#data tr").not(this).removeClass("jstree-clicked");
        }
        // Если элемент выбран
        if ($(this).hasClass("jstree-clicked")) {
            $(this).addClass("jstree-hover").removeClass("jstree-clicked");
        }
        // Если элемент не выбран
        else {
            $(this).addClass("jstree-clicked");
        }
        // Если выделено более одной строки кнопка переименовать не активна
        if($("#data tr.jstree-clicked").length > 1) {
            $("#renameBtn").attr('disabled', true);
        }
        else{
            $("#renameBtn").removeAttr('disabled');
        }
        $("#removeBtn").removeAttr('disabled');
        $("#moveBtn").removeAttr('disabled');
        e.preventDefault();
    });
    // Наведение на элемент списка
    $("#data").on("mouseenter", "tr", function (e) {
        if (!$(this).hasClass("jstree-clicked"))
            $(this).addClass("jstree-hover")
    });
    // Курсор мыши покидает элемент списка
    $("#data").on("mouseleave", "tr", function (e) {
        $(this).removeClass("jstree-hover")
    });
    // Запрет вызова стандартного контекстного меню
    document.oncontextmenu = function () {
        return false;
    };
    // Вызов контехстного меню
    $("#data").on("mouseup", "tr", function (e) {
        // Ннажата ли правая кнопка мыши
        if (e.which === 3 && $(e.target).closest("#data").length != 0) {
            var contextmenu = "";
            // Если выделено меньше двух элементов или клик по не выделенному элементу
            if ($("#data tr.jstree-clicked").length < 2 || !$(this).hasClass("jstree-clicked")) {
                if(!$(this).hasClass("jstree-clicked")) {
                    $("#data tr").removeClass("jstree-clicked");
                    $(this).addClass("jstree-clicked");
                }
                // Кнопка переименовать активна
                $("#renameBtn").removeAttr("disabled");
                contextmenu += "<li><a href='#' id='renameMenu'>Переименовать</a></li>";
            }
            // Меню
            contextmenu += "<li><a href='#' id='removeMenu'>Удалить</a></li><li><a href='#' id='moveMenu'>Переместить</a></li>";
            if(isMove){
                contextmenu += "<li><a href='#' id='pasteMenu'>Вставить</a></li>";
            }
            $("body").append("<div class='context-menu' style='left:" + e.pageX + "px;top:" + e.pageY + "px;display: none;'><ul>" + contextmenu + "</ul></div>");
            $(".context-menu").show("fast");
        }
    });
    // Закрытие контекстного меню
    $(document).mousedown(function (e) {
        if ($($(event.target)).closest(".context-menu").length == 0) {
            $('.context-menu').remove();
        }
    });

    // Переименовать файл или папку
    $("body").on("click", "#renameMenu, #renameBtn", function () {
        // Отмена перемещения
        $("#massageMenu").text("");
        isMove = false;
        // Кнопка вставить не активна
        $("#pasteBtn").attr('disabled', true);
        // Закрытие контекстного меню
        $('.context-menu').remove();
        // Переименуемый элемент
        var renameElement = $("#data tr.jstree-clicked:first td:first span");
        rename_element(renameElement);
    });
    // Вывод input для переименования
    function rename_element(renameElement) {
        var textElement = $(renameElement).text();
        // Создание input
        var textInput = "<input type='text' id='inputNewName' value='" + textElement + "'>";
        // Очистить строку и добавить input
        $(renameElement).text("").append(textInput);
        // Авто изменение ширины, установка фокуса и обработка петери фокуса для input
        $("#inputNewName").autosizeInput().focus().select().focusout(function () {
            $(renameElement).text(textElement);
            $(this).remove();
            isRename = false;
        });
        isRename = true;
    }
    // При нажатии enter в input, отправка запроса на переименование
    $("body").on("keypress", "#inputNewName", function (e) {
        if(e.keyCode == 13){
            var row = $(this).closest("tr");
            var newName = $("#inputNewName").val();
            // Проверка имени
            $("#data tr").not(".header-table").each(function (i, item) {
                if($(item).find("td:first span").text() == newName){
                    var type = $(item).is(":has(.folder)") ? "папку" : "файл";
                    $('#dialog').dialog({title:"Предупреждение"});
                    $('#dialog').html("<p>Текущая папка уже содержит " + type +" с именем " + newName + "</p>").dialog("open");
                    isRename = false;
                    return false;
                }
            });
            if(isRename) {
                $.get('?operation=rename_content', {'id': $(row).data("id"), 'newName': newName})
                    .done(function () {
                        $(row).find("td:first span").text(newName);
                        $(this).remove();
                    })
                    .fail(function () {
                        if ($(row).is(":has(.folder)")) {
                            $('#dialog').dialog({title:"Ошибка"});
                            $('#dialog').html("<p>Не удалось переименовать папку</p>").dialog("open");
                        }
                        else if ($(row).is(":has(.file)")) {
                            $('#dialog').dialog({title:"Ошибка"});
                            $('#dialog').html("<p>Не удалось переименовать файл</p>").dialog("open");
                        }
                    });
            }
        }
    });

    // Удаление файлов и папок
    $("body").on("click", "#removeMenu, #removeBtn", function () {
        // Отмена перемещения
        $("#massageMenu").text("");
        isMove = false;
        // Кнопка вставить не активна
        $("#pasteBtn").attr('disabled', true);
        // Закрытие контекстного меню
        $('.context-menu').remove();
        var selectedElements = $("#data tr.jstree-clicked");
        var removeElement = [];
        // Создание массива удаляемых элементов
        selectedElements.each(function (i, item) {
            removeElement.push({ 'id' : $(item).data("id") })
        });
        $.get('?operation=remove_contents', { "items": JSON.stringify(removeElement) })
            .done(function () {
                // Удаление файлов и папок из таблицы
                //removeElement.forEach( item => $("#data [data-id='" + item.id + "']").remove());
                removeElement.forEach(function (item) {
                    $("#data [data-id='" + item.id + "']").remove();
                });
                // Оставшиеся папки
                var remainingFolders = $("#data #folders tr");
                // Если удалены все папки, удалить заголовок
                if(remainingFolders.length < 2){
                    $(remainingFolders).remove();
                }
                // Оставшиеся файлы
                var remainingFiles = $("#data #files tr");
                // Если удалены все файлы, удалить заголовок
                if(remainingFiles.length < 2){
                    $(remainingFiles).remove();
                }
                // Обновление выделенной папки в обозревателе
                refresh_node($(".jstree a.jstree-clicked").parent());
            })
            .fail(function () {
                // Обновление выделенной папки в обозревателе
                refresh_node($(".jstree a.jstree-clicked").parent());
                // Загрузка содержимого выделенной папки в обозревателе
                get_contents($($(".jstree a.jstree-clicked").parent()).data("id"));
            });
    });

    // Выбор элементов для перемещения
    $("body").on("click", "#moveMenu, #moveBtn", function () {
        $('.context-menu').remove();
        var selecdetElement = $("#data tr.jstree-clicked");
        if(selecdetElement.length != 0) {
            moveElement = [];
            moveNameElement = [];
            var folder = 0, file = 0;
            /*selecdetElement.each(function (i, item) {
             moveElement.push({ 'id' : $(item).data("id") })
             });*/
            for (var i = 0; i < selecdetElement.length; i++) {
                // Создание списка перемещаемых объектов
                moveElement.push({'id': $(selecdetElement[i]).data("id")});
                moveNameElement.push({
                    name: $(selecdetElement[i]).find("td:first span").text(),
                    type: $(selecdetElement[i]).is(":has(.folder)") ? "folder" : "file"
                });
                if ($(selecdetElement[i]).is(":has(.folder)")) {
                    folder++;
                }
                else if ($(selecdetElement[i]).is(":has(.file)")) {
                    file++;
                }
            }
            // Текст для папок
            function folderText(n) {
                if (n > 4)
                    return "папок";
                var text = ["папка", "папки", "папки", "папки"];
                return text[n - 1];
            }

            // Текст для файлов
            function fileText(n) {
                if (n > 4)
                    return "файлов";
                var text = ["файл", "файла", "файла", "файла"];
                return text[n - 1];
            }

            var massege = "Для перемещения выбранно ";
            if (folder != 0) {
                massege += folder + " " + folderText(folder);
            }
            if (file != 0) {
                if (folder != 0) {
                    massege += " и ";
                }
                massege += file + " " + fileText(file);
            }
            if (folder != 0 || file != 0) {
                $("#massageMenu").text(massege);
            }
            oldFolder = $("#currentDir").text();
            isMove = true;
            // Кнопка вставить активна
            $("#pasteBtn").removeAttr('disabled');

        }
    });

    // Вставить перемещаемые объекты
    $("body").on("click", "#pasteBtn, #pasteMenu", function () {
        if(isMove) {
            // Создание списка существующих объектов в выбраной (текущей) папке
            var currentElementsDir = [];
            $("#data tr").not(".header-table").each(function (i, item) {
                currentElementsDir.push({
                    name: $(item).find("td:first span").text(),
                    type: $(item).is(":has(.folder)") ? "folder" : "file"
                });
            });
            // Создание списка совпадающих имён
            //var matchNames = moveNameElement.filter(moveItem => currentElementsDir.some(curItem => curItem.name == moveItem.name));
            var matchNames = moveNameElement.filter(function (moveItem) {
                return currentElementsDir.some(function (curItem) {
                    return curItem.name == moveItem.name && curItem.type == moveItem.type;
                })
            });
            if (matchNames.length == 0) {
                var el = $(".jstree a.jstree-clicked").parent();
                $.get('?operation=move_contents', {"items": JSON.stringify(moveElement), "parent": $(el).data("id")})
                    .done(function (d) {
                        // Обновление папки из которой перемещались элементы
                        refresh_node($("#tree [data-id='" + oldFolder + "']"));
                        // Обновление выделенной папки в обозревателе
                        refresh_node($(".jstree a.jstree-clicked").parent());
                        // Загрузка содержимого выделенной папки в обозревателе
                        get_contents($($(".jstree a.jstree-clicked").parent()).data("id"));
                    })
                    .fail(function () {
                        // Обновление папки из которой перемещались элементы
                        refresh_node($("#tree [data-id='" + oldFolder + "']"));
                        // Обновление выделенной папки в обозревателе
                        refresh_node($(".jstree a.jstree-clicked").parent());
                        // Загрузка содержимого выделенной папки в обозревателе
                        get_contents($($(".jstree a.jstree-clicked").parent()).data("id"));
                    });
            }
            // Если имена существуют
            else {
                var matchNamesFolders = [], matchNamesFiles = [];
                // Создание списка совпадающих файлов и папок
                matchNames.forEach(function (item) {
                    if (item.type == "folder") {
                        matchNamesFolders.push(item.name);
                    }
                    else if (item.type == "file") {
                        matchNamesFiles.push(item.name);
                    }
                });
                var message = "Перемещение не возможно, конечная папка уже содержит:<br>";
                if (matchNamesFolders.length != 0) {
                    message += (matchNamesFolders.length == 1 ? "папку " : "папки ") + matchNamesFolders.join(", ");
                }
                if (matchNamesFiles.length != 0) {
                    if (matchNamesFolders.length != 0) {
                        message += "<br>и ";
                    }
                    message += (matchNamesFiles.length == 1 ? "файл " : "файлы ") + matchNamesFiles.join(", ");
                }
                message += "<br>Переименуйте перемещаемые элементы и повторите попытку.";
                $('#dialog').dialog({title:"Предупреждение"});
                $('#dialog').html("<p>" + message + "</p>").dialog("open");
            }
            $("#massageMenu").text("");
            isMove = false;
            // Кнопка вставить не активна
            $("#pasteBtn").attr('disabled', true);
        }
    });

    // Диалоговое окно
    $('#dialog').dialog({
        modal:true,
        title: "Предупреждение",
        //buttons:{ Ok: function(){ $(this).dialog( "close" );}},
        //closeOnEscape: false,
        autoOpen: false,
        resizable: false,
        width: 480
    });

    // Обновление дерева узлов
    function refresh_node(el) {
        if(el && el.length != 0) {
            // Если узел открыт
            if ($(el).hasClass("jstree-open")) {
                $(el).children("ul").hide(300, function () {
                    $(this).remove();
                    $(el).removeClass("jstree-closed").addClass("jstree-loading");
                    load_children_nodes($(el).data("id"), true);
                });
                $(el).removeClass("jstree-open").addClass("jstree-closed");
            }
            // Если узел закрыт
            else {
                $(el).children("ul").remove();
                $(el).removeClass("jstree-closed").addClass("jstree-loading");
                load_children_nodes($(el).data("id"));
            }
        }
    }
    // Открытие меню выбора файлов для отправки на сервер
    $("body").on("click", "#loadBtn", function () {
        var form = "<form method=post multiple enctype=multipart/form-data>" +
            "<input type=hidden name=MAX_FILE_SIZE value=10485760 >" +
            "<input type=file name=file>" +
            "<input type=submit value=Загрузить></form>";
        form = "<input style='width: 140px;' type='file' multiple='multiple' name='files[]'><input type='submit' value='Загрузить файлы'><div id='form-warning'>Файл не выбран</div>";
        $('#dialog').dialog({title:"Загрузка фала"});
        $('#dialog').html(form).dialog("open");
        isUpload = true;
    });
    // Проверка файлов при выборе
    $("body").on("change", "input[type=file]", function (e){
        // Создание списка существующих объектов в выбраной (текущей) папке
        var currentElementsDir = [];
        $("#data tr").not(".header-table").each(function (i, item) {
            if($(item).is(":has(.file)") ){
                currentElementsDir.push({
                    name: $(item).find("td:first span").text() + "." + $(item).find("td:last span").text()
                });
            }
        });
        uploadFiles = this.files;
        var totalSize = 0, files = "", isExist = false;
        $.each(uploadFiles, function(i, item){
            isExist = currentElementsDir.some(function (curItem) {
                return curItem.name == item.name;
            });
            if(item.size > 10485760){
                files += "<span style='color: red'>" + item.name + " &gt; 10Mб</span><br>";
                isUpload = false;
            }
            else if(isExist){
                files += "<span style='color: red'>" + item.name + " существует в текущей папке</span><br>";
                isUpload = false;
            }
            else{
                files += "<span>" + item.name + "</span><br>";
            }
            totalSize += item.size;
        });
        if(totalSize > 10485760){
            files += "<span style='color: red'>Размер файлов превышает 10Mб</span><br>";
            isUpload = false;
        }
        $("#form-warning").html(files);
    });

    var uploadFiles, isUpload = true;

    // Отправка файлов на сервер
    $("body").on("click", "input[type=submit]", function (e) {
    //$('.submit.button').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        if(isUpload) {
            var data = new FormData();
            $(uploadFiles).each(function (i, item) {
                data.append("files[]", item);
            });
            var parent = $(".jstree a.jstree-clicked").parent().data("id");
            data.append("upload_folder", parent);
            $.ajax({
                url: "?operation=upload_files",
                type: "POST",
                data: data,
                cache: false,
                dataType: "json",
                processData: false,
                contentType: false,
                xhr: function () {
                    var xhr = $.ajaxSettings.xhr();
                    xhr.upload.addEventListener("progress", progress, false);
                    return xhr;
                },
                success: function (respond) {
                    if (respond.status == "OK") {
                        // Обновление выделенной папки в обозревателе
                        refresh_node($(".jstree a.jstree-clicked").parent());
                        // Загрузка содержимого выделенной папки в обозревателе
                        get_contents($($(".jstree a.jstree-clicked").parent()).data("id"));
                    }
                    else if (respond.status == "Error") {
                        var message = "", msgExists = "", msgSsave = "", msgSize = "", msgUpload = "";
                        if (respond.files) {
                            respond.files.forEach(function (item, i) {
                                if (item["exists"]) {
                                    msgExists += item["exists"] + ", ";
                                }
                                else if (item["save"]) {
                                    msgExists += item["save"] + ", ";
                                }
                                else if (item["size"]) {
                                    msgExists += item["size"] + ", ";
                                }
                                else if (item["upload"]) {
                                    msgExists += item["upload"] + ", ";
                                }
                            });
                            message += (msgExists ? msgExists + " уже существует(ют).<br>" : "") + (msgSsave ? msgSsave + " не удалось сохранить.<br>" : "") +
                                (msgSize ? msgSize + " превышает(ют) допустимый размер.<br>" : "") + (msgUpload ? msgUpload + " не удалось загрузить.<br>" : "");
                        }
                        else {
                            message = "Ошибка ответа сервера";
                        }
                        $('#dialog').dialog({title: "Ошибка загрузки"});
                        $('#dialog').html("<p>" + message + "</p>").dialog("open");
                    }
                    else {
                        $('#dialog').dialog({title: "Ошибка загрузки"});
                        $('#dialog').html("<p>Ошибка отправки файлов на сервер</p>").dialog("open");
                    }
                },
                error: function (jqXHR, textStatus) {
                    $('#dialog').dialog({title: "Ошибка запроса"});
                    $('#dialog').html("<p>Ошибка отправки запроса на сервер</p>").dialog("open");
                }
            });
            $('#dialog').dialog("close");
        }
        else{
            $('#dialog').dialog({title: "Загрузка на сервер не возможна"});
        }
    });

    function progress(e){
        if (e.lengthComputable) {
            var percentComplete = Math.floor((e.loaded / e.total) * 100);
            console.log(percentComplete);
        }
    }
    // Создание папки
    $("body").on("click", "#createBtn", function () {
        // Создание списка существующих объектов в выбраной (текущей) папке
        var currentElementsDir = [], isExist = true, nameFolder = "Новая папка", number = 1;
        $("#data tr").not(".header-table").each(function (i, item) {
            if($(item).is(":has(.folder)") ){
                currentElementsDir.push({
                    name: $(item).find("td:first span").text()
                });
            }
        });
        isExist = currentElementsDir.some(function (curItem) {
            return curItem.name == nameFolder;
        });
        while(isExist) {
            nameFolder = "Новая папка (" + number++ + ")";
            isExist = currentElementsDir.some(function (curItem) {
                return curItem.name == nameFolder;
            });
        }
        var parent = $(".jstree a.jstree-clicked").parent();
        $.get("?operation=create_content", {"id": nameFolder, "parent": $(parent).data("id")}, function (respond){
            if(respond.status == "OK"){
                refresh_node($(".jstree a.jstree-clicked").parent());
                var headerFolders = $("#data #folders tr.header-table");
                if(headerFolders.length == 0){
                    $("#folders").append("<tr class='header-table'><td><nobr><span>Имя</span></nobr></td><td><nobr><span>Дата" +
                        "</span></nobr><td><nobr><span></span></nobr></td><td colspan='50'>&nbsp;</td></tr>");
                }
                $("#folders").append(get_html_folder(respond.id, respond.name, respond.date));
                var renameElement = $("#folders [data-id='" + respond.id + "'] td:first span");
                rename_element(renameElement);
            }
        })
    })
});