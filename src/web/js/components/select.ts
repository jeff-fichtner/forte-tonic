/**
 *
 */
export class Select {
  /**
   *
   */
  constructor(
    selectId,
    defaultOptionsText = null,
    noOptionsText = null,
    options = [],
    onChangeFunction = null
  ) {
    this.select = document.getElementById(selectId); // Get the select element by ID

    if (!this.select) {
      console.error(`Select element with ID '${selectId}' not found in DOM`);
      throw new Error(`Select element with ID '${selectId}' not found`);
    }

    this.onChangeFunction = onChangeFunction ?? (event => {}); // Store the change event handler
    this.defaultOptionsText = defaultOptionsText || 'Select an option'; // Default text for the select options
    this.noOptionsText = noOptionsText || 'No options available'; // Default text when no options are available
    this.populateOptions(options); // Populate the select with options
    this.select.addEventListener('change', this.onChangeFunction);
  }
  // getSelectedOption
  /**
   *
   */
  getSelectedOption() {
    return this.select.value; // Return the currently selected option value
  }
  // setSelectedOption
  /**
   *
   */
  setSelectedOption(value) {
    this.select.value = value; // Set the selected option by value
    this.refresh();
  }
  /**
   *
   */
  clearSelectedOption() {
    this.setSelectedOption(''); // Clear the selected option
  }
  /**
   *
   */
  refresh() {
    this.populateOptions(this.options);
  }
  /**
   *
   */
  populateOptions(newOptions, forceRefresh = false) {
    if (!this.select) {
      console.error('Cannot populate options: select element is null');
      return;
    }

    this.options = newOptions; // Update the options
    const optionTextToUse = this.options.length > 0 ? this.defaultOptionsText : this.noOptionsText;
    // get current selected option
    const currentSelectedValue = this.getSelectedOption();
    // clear existing options
    this.select.innerHTML = '';
    // create a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = optionTextToUse;
    this.select.appendChild(defaultOption);
    // populate new options
    newOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (!forceRefresh && currentSelectedValue && option.value == currentSelectedValue) {
        opt.selected = true;
      }
      this.select.appendChild(opt);
    });
    M.FormSelect.init(this.select, {
      classes: this.select.id,
      dropdownOptions: {
        alignment: 'left',
        coverTrigger: false,
        constrainWidth: false,
      },
    });
  }
}

// Expose to window for console debugging and runtime access
window.Select = Select;
