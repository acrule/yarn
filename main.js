define([
    'base/js/namespace',
    'notebook/js/codecell',
    'base/js/events'
],function(
    Jupyter,
    codecell,
    events
){

    var CodeCell = codecell.CodeCell;

// VERSION MARKER EVENTS
    // changes cell metadata and marker highlighting
    function change_version(cell, v){
        cell.metadata.current_version = v;
        var input_area = cell.element.find('div.input_area')[0];
        var markers = input_area.getElementsByClassName('version')
        for (var i = 0; i < markers.length; i++){
            markers[i].style.background = "#ccc";
            if (i == v){
                markers[i].style.background = "#333";
            }
        }
        cell.set_text(cell.metadata.versions[v]['in']);
        cell.output_area.clear_output()
        for(var i = 0; i < cell.metadata.versions[v]['out'].length; i++){
            cell.output_area.append_output(cell.metadata.versions[v]['out'][i])
        }
    }

    function createClick(cell, v){
        return function() {
          change_version(cell, v);
        }
    }

    function preview_version(marker, cell, v){
        // only execute if we are previewing an alternate version
        if (v != cell.metadata.current_version){
            marker.style.background = "#999";
            cell.set_text(cell.metadata.versions[v]['in']);
            cell.output_area.clear_output()
            for(var i = 0; i < cell.metadata.versions[v]['out'].length; i++){
                cell.output_area.append_output(cell.metadata.versions[v]['out'][i])
            }
        }
    }

    function createMouseover(marker, cell, v) {
      return function() {
        preview_version(marker, cell, v);
      }
    }

    function restore_current(marker, cell, v){
        // only execute if we are mousing out of an alternate version
        var cv = cell.metadata.current_version
        if (v != cv){
            marker.style.background = "#ccc";
            cell.set_text(cell.metadata.versions[cv]['in'])
            cell.output_area.clear_output()
            for (var i = 0; i < cell.metadata.versions[v]['out'].length; i++){
                cell.output_area.append_output(cell.metadata.versions[cv]['out'][i])
            }
        }
    }

    function createMouseout(marker, cell, v) {
      return function() {
        restore_current(marker, cell, v);
      }
    }

    function toggle_version_markers(marker, cell){
        num_versions = cell.metadata.versions.length;
        if (marker.className == "marker summary collapsed"){ // could be better
                // possibly animate these transitions?
                marker.style.right = (30 * (num_versions) + 6).toString() + "px";
                marker.innerHTML = ">";
                render_version_markers(cell);
                marker.className = "marker summary expanded"
        }
        else{
            // remove version markers
            var input_area = cell.element.find('div.input_area')[0]; // get the first input area
            var markers = input_area.getElementsByClassName('version')
            while(markers[0]){
                markers[0].parentNode.removeChild(markers[0]);
            }
            // possibly animate these transitions?
            marker.style.right = "6px";
            marker.innerHTML = num_versions;
            marker.className = "marker summary collapsed"
        }
    }

    function createSummaryClick(marker, cell) {
        return function() {
            toggle_version_markers(marker, cell);
        }
    }

// RENDER VERSION MARKERS

    function render_summary_marker(cell){

        // remove all markers from input area
        var input_area = cell.element.find('div.input_area')[0]; // get the first input area
        var markers = input_area.getElementsByClassName('marker')
        while(markers[0]){
            markers[0].parentNode.removeChild(markers[0]);
        }

        input_area.style.position = "relative";

        if(cell.metadata.versions){
            var num_versions = cell.metadata.versions.length
            var newElement = document.createElement('div');
            newElement.className = "marker summary collapsed"
            newElement.style.width = "24px";
            newElement.style.height = "24px";
            newElement.style.border = "2px solid #cfcfcf";
            newElement.style.borderRadius = "12px";
            newElement.style.position = "absolute";
            newElement.style.top = "6px";
            newElement.style.right = "6px";
            newElement.style.zIndex = 10;
            newElement.style.background = "#999";
            // text
            newElement.innerHTML = num_versions;
            newElement.style.color = "#fff";
            newElement.style.padding = "3px 0px 0px";
            newElement.style.textAlign = "center";

            // events
            newElement.onclick = createSummaryClick(newElement, cell);

            input_area.appendChild(newElement);

        }
    }

    function render_version_markers(cell){

        // remove all markers from input area
        var input_area = cell.element.find('div.input_area')[0]; // get the first input area
        var markers = input_area.getElementsByClassName('version')
        while(markers[0]){
            markers[0].parentNode.removeChild(markers[0]);
        }
        // styling
        input_area.style.position = "relative";

        if(cell.metadata.versions){
            var num_versions = cell.metadata.versions.length
            for(var v = 0; v < num_versions; v++){
                var newElement = document.createElement('div');
                newElement.className = "marker version"
                newElement.style.width = "24px";
                newElement.style.height = "24px";
                newElement.style.border = "2px solid #cfcfcf";
                newElement.style.borderRadius = "12px";
                newElement.style.position = "absolute";
                newElement.style.top = "6px";
                newElement.style.right = (30 * (num_versions-v-1) + 6).toString() + "px";
                newElement.style.zIndex = 10;
                // assign colors
                if (v == cell.metadata.current_version){
                    newElement.style.background = "#333";
                } else {
                    newElement.style.background = "#ccc";
                }
                // events
                // newElement.onmouseover = createMouseover(newElement, cell, v);
                // newElement.onmouseout = createMouseout(newElement, cell, v);
                newElement.onclick = createClick(cell, v);
                // newElement.oncontextmenu = createContextClick(newElement, cell);

                input_area.appendChild(newElement);
            }
        }
    }

    function initialize_markers(){
        var cells = Jupyter.notebook.get_cells();
        for (var i = 0; i < cells.length; i++){
            var cell = cells[i];
            if (cell instanceof CodeCell) {
                render_summary_marker(cell);
            }
        }
    }

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
            render_version_markers(cell);
        }
    }

    function patch_CodeCell_execute(){
        console.log('[Yarn] patching CodeCell.prototype.execute');
		var old_execute = CodeCell.prototype.execute;

        CodeCell.prototype.execute = function () {
            old_execute.apply(this, arguments);
            check_version(this);
		}
    }

    // patch keydown to have events for manipulating history
    function patch_keydown(){
        document.onkeydown = function(e){
            cell = Jupyter.notebook.get_selected_cell();
            input_area = cell.element.find('div.input_area')[0];
            expanded = input_area.getElementsByClassName("expanded");
            if (cell.mode == "command" && expanded.length > 0){
                if (e.keyCode == 37){ // left
                    old_version = cell.metadata.current_version;
                    if (old_version > 0){
                        v = old_version - 1;
                        change_version(cell, v)
                    }
                }
                else if(e.keyCode == 39){ // right
                    old_version = cell.metadata.current_version;
                    if (old_version < cell.metadata.versions.length - 1){
                        v = old_version + 1;
                        change_version(cell, v)
                    }
                }
                else if(e.keyCode == 8 && cell.metadata.versions.length > 1){ // delete, and check there are at least two versions
                    cell.metadata.versions.splice(cell.metadata.current_version, 1);
                    if (cell.metadata.versions.length -1 == cell.metadata.current_version){
                        cell.metadata.current_version--;
                    }
                    render_version_markers(cell);
                }
            }
        }
    }

    function load_extension(){
        patch_CodeCell_execute();
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
