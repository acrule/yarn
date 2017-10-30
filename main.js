define([
    'require',
    'jquery',
    'base/js/namespace',
    'notebook/js/codecell',
    'base/js/events'
],function(
    require,
    $,
    Jupyter,
    codecell,
    events
){

    // reference for later use
    var CodeCell = codecell.CodeCell;

    // load external stylesheet from main.css
    var load_css = function() {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = require.toUrl("./main.css");
        document.getElementsByTagName("head")[0].appendChild(link);
    };

// MARKER CLICK EVENTS
    // changes cell metadata, input, output, and  marker highlighting
    function change_version(cell, v){
        var input_area = cell.element.find('div.input_area')[0];
        var markers = input_area.getElementsByClassName('version')
        var versions = cell.metadata.versions

        // update cell metadata
        cell.metadata.current_version = v;

        // update cell input and output
        cell.set_text(versions[v]['in']);
        cell.output_area.clear_output()
        for(var i = 0; i < versions[v]['out'].length; i++){
            cell.output_area.append_output(versions[v]['out'][i])
        }

        // highlight marker for selected version
        for (var i = 0; i < markers.length; i++){
            if (i == v){ markers[i].classList.add('selected-version') }
            else{ markers[i].classList.remove('selected-version') }
        }
    }

    function createVersionClick(cell, v){
        return function() {
          change_version(cell, v);
        }
    }

    function toggle_version_markers(marker, cell){
        cell.metadata.versions_showing = !cell.metadata.versions_showing;
        render_markers(cell);
    }

    function createSummaryClick(marker, cell) {
        return function() {
            toggle_version_markers(marker, cell);
        }
    }

// RENDERING Functions
    function render_summary_marker(cell){
        if(cell.metadata.versions){
            var input_area = cell.element.find('div.input_area')[0];
            var num_versions = cell.metadata.versions.length
            var showing = cell.metadata.versions_showing

            // clear current summary marker
            var markers = input_area.getElementsByClassName('summary')
            while(markers[0]){
                markers[0].parentNode.removeChild(markers[0]);
            }

            if (cell.selected){
                // prepare for absolute positioning of marker
                input_area.style.position = "relative";

                // styling
                var newElement = document.createElement('div');
                newElement.className = "marker summary fa fa-undo"
                newElement.style.right = "2px"; // could cause a bug here

                // events
                newElement.onclick = createSummaryClick(newElement, cell);

                input_area.appendChild(newElement);
            }
        }
    }

    function render_version_markers(cell){
        if(cell.metadata.versions){
            var num_versions = cell.metadata.versions.length;
            var showing = cell.metadata.versions_showing;
            var input_area = cell.element.find('div.input_area')[0]; // get the first input area

            // clear current markers
            var markers = input_area.getElementsByClassName('version');
            while(markers[0]){
                markers[0].parentNode.removeChild(markers[0]);
            }

            if(showing && cell.selected && num_versions > 0){

                // prepare for absolute positioning of markers
                input_area.style.position = "relative";

                // render new ones
                for(var v = 0; v < num_versions; v++){
                    var newElement = document.createElement('div');
                    newElement.className = "marker version";
                    newElement.style.right = (28 * (num_versions-v) + 2).toString() + "px";

                    // assign colors
                    if (v == cell.metadata.current_version){
                        //newElement.style.background = "#ccc";
                        newElement.classList.add('selected-version')
                    } else {
                        //newElement.style.background = "#fff";
                        newElement.classList.remove('selected-version')
                    }

                    // events
                    newElement.onclick = createVersionClick(cell, v);
                    newElement.ondblclick = function(){
                        console.log("You double clicked this element!");                        
                    }

                    input_area.appendChild(newElement);
                }
            }
        }
    }

    function render_markers(cell){
        // make sure the showing variable has a value before we call renderers
        if (cell.metadata.versions_showing === undefined){
            cell.metadata.versions_showing = false;
        }
        render_version_markers(cell);
        render_summary_marker(cell);
    }

    function initialize_markers(){
        var cells = Jupyter.notebook.get_cells();
        for (var i = 0; i < cells.length; i++){
            var cell = cells[i];
            if (cell instanceof CodeCell) {
                render_markers(cell);
            }
        }
    }

// VERSION CONTROL
    function check_version(cell){
        var version = {'in': cell.get_text(), 'out': cell.output_area.outputs}
        // version control
        if (cell.metadata.versions === undefined){
            cell.metadata.versions = [version];
            cell.metadata.current_version = 0;
        } else {
            cell.metadata.versions.push(version);
            cell.metadata.current_version = cell.metadata.versions.length-1;

            // check if version is distinct from already saved versions
            // var current_version = cell.metadata.versions.indexOf(version);
            // if (current_version == -1){
            //     cell.metadata.versions.push(version);
            //     cell.metadata.current_version = cell.metadata.versions.length-1;
            // }
            // else {
            //     cell.metadata.current_version = current_version;
            // }

        }
        render_markers(cell);
    }

    function patch_CodeCell_execute(){
        console.log('[Yarn] patching CodeCell.prototype.execute');
		var old_execute = CodeCell.prototype.execute;

        CodeCell.prototype.execute = function () {
            old_execute.apply(this, arguments);
            check_version(this);
		}
    }

    function patch_CodeCell_select(){
        console.log('[Yarn] patching CodeCell.prototype.select');
		var old_select = CodeCell.prototype.select;

        CodeCell.prototype.select = function () {
            old_select.apply(this, arguments);
            render_markers(this);
		}
    }

    function patch_CodeCell_unselect(){
        console.log('[Yarn] patching CodeCell.prototype.unselect');
		var old_unselect = CodeCell.prototype.unselect;

        CodeCell.prototype.unselect = function () {
            old_unselect.apply(this, arguments);
            //this.metadata.versions_showing = false;
            render_markers(this);
		}

    }

    function patch_keydown(){
        document.onkeydown = function(e){
            var cell = Jupyter.notebook.get_selected_cell();
            var expanded = cell.metadata.versions_showing
            var versions = cell.metadata.versions

            if (cell.mode == "command" && expanded){ // if not editing cell and versions are showing
                if (e.keyCode == 37){ // left
                    if (cell.metadata.current_version > 0){
                        cell.metadata.current_version--;
                        change_version(cell, cell.metadata.current_version)
                    }
                }
                else if(e.keyCode == 39){ // right
                    if (cell.metadata.current_version < versions.length - 1){
                        cell.metadata.current_version++;
                        change_version(cell, cell.metadata.current_version)
                    }
                }
                else if(e.keyCode == 8 && versions.length > 1){ // delete, and check there are at least two versions
                    versions.splice(cell.metadata.current_version, 1);
                    if (versions.length == cell.metadata.current_version){
                        cell.metadata.current_version--;
                    }
                    render_markers(cell);
                    change_version(cell, cell.metadata.current_version);
                }
            }
        }
    }

    function load_extension(){
        load_css();
        patch_CodeCell_execute();
        patch_CodeCell_select();
        patch_CodeCell_unselect();
        patch_keydown();

        // module loading is asynchronous so we need to handle
        // the case where the notebook is not yet loaded
        if (typeof Jupyter.notebook === "undefined") {
            events.on("notebook_loaded.Notebook", initialize_markers);
        } else {
            initialize_markers();
        }
    }

    return {
        load_jupyter_extension : load_extension,
        load_ipython_extension: load_extension
    };
});
