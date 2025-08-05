/**
 *
 */
export class Table {
  /**
   *
   */
  constructor(
    tableId,
    headers,
    rowFunction,
    initialRows = null,
    onClickFunction = null,
    filterFunction = null,
    onFilterChanges = null,
    options = {}
  ) {
    this.table = document.getElementById(tableId);
    this.pagination = options.pagination || false;
    this.itemsPerPage = options.itemsPerPage || 10;
    this.currentPage = 1;
    
    const head = document.createElement('thead'); // Create a new table header

    for (const header of headers) {
      const th = document.createElement('th'); // Create a new header cell
      th.textContent = header; // Set the header text
      head.appendChild(th); // Append the header to the header
    }
    this.table.appendChild(head); // Append the header to the table
    this.table.appendChild(document.createElement('tbody')); // Create a table body

    this.filterFunction = filterFunction; // Store the filter function
    this.rowFunction = rowFunction; // Store the row function
    
    // Create pagination container if pagination is enabled
    if (this.pagination) {
      this.paginationContainer = document.createElement('div');
      this.paginationContainer.className = 'pagination-container center-align';
      this.paginationContainer.style.marginTop = '20px';
      this.table.parentNode.insertBefore(this.paginationContainer, this.table.nextSibling);
    }
    
    if (initialRows) {
      this.replaceRange(initialRows); // Populate the table with initial rows
    }
    this.table.addEventListener('click', event => {
      if (onClickFunction) onClickFunction(event); // Attach the click event handler
    });
    if (onFilterChanges && onFilterChanges.length > 0) {
      for (const onFilterChange of onFilterChanges) {
        // when checkboxes in filterId change
        document.getElementById(onFilterChange.filterId).addEventListener('change', event => {
          if (onFilterChange.type === 'checkbox' && event.target.type !== onFilterChange.type) {
            return;
          }
          if (onFilterChange.type === 'select-multiple' && event.target.tagName !== 'SELECT') {
            return;
          }
          // re-render registrations (reset to page 1 when filtering)
          this.currentPage = 1;
          this.refresh();
        });
      }
    }
  }
  /**
   *
   */
  refresh() {
    // Re-render the table with the current rows
    this.replaceRange(this.rows);
  }
  
  /**
   * Create pagination controls
   */
  createPaginationControls(totalPages) {
    if (!this.pagination || !this.paginationContainer) return;
    
    this.paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const ul = document.createElement('ul');
    ul.className = 'pagination';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = this.currentPage === 1 ? 'disabled' : 'waves-effect';
    const prevA = document.createElement('a');
    prevA.href = '#!';
    prevA.innerHTML = '<i class="material-icons">chevron_left</i>';
    prevA.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.currentPage > 1) {
        this.currentPage--;
        this.refresh();
      }
    });
    prevLi.appendChild(prevA);
    ul.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement('li');
      li.className = i === this.currentPage ? 'active' : 'waves-effect';
      const a = document.createElement('a');
      a.href = '#!';
      a.textContent = i;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentPage = i;
        this.refresh();
      });
      li.appendChild(a);
      ul.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = this.currentPage === totalPages ? 'disabled' : 'waves-effect';
    const nextA = document.createElement('a');
    nextA.href = '#!';
    nextA.innerHTML = '<i class="material-icons">chevron_right</i>';
    nextA.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.refresh();
      }
    });
    nextLi.appendChild(nextA);
    ul.appendChild(nextLi);
    
    this.paginationContainer.appendChild(ul);
  }
  
  // Method to add a row with data
  /**
   *
   */
  replaceRange(rows) {
    this.rows = rows;
    const body = this.table.querySelector('tbody');
    body.innerHTML = ''; // Clear existing rows

    try {
      if (!rows || rows.length === 0) {
        // no rows message
        if (this.pagination) {
          this.createPaginationControls(0);
        }
        return;
      }
      
      // Filter rows first
      const filteredRows = rows.filter(row => {
        if (this.filterFunction && !this.filterFunction(row)) {
          return false;
        }
        return true;
      });
      
      // Calculate pagination
      let displayRows = filteredRows;
      let totalPages = 1;
      
      if (this.pagination) {
        totalPages = Math.ceil(filteredRows.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        displayRows = filteredRows.slice(startIndex, endIndex);
        
        // Create pagination controls
        this.createPaginationControls(totalPages);
      }
      
      // Render rows
      for (const row of displayRows) {
        const tr = document.createElement('tr'); // Create a new table row
        tr.innerHTML = this.rowFunction(row); // Get the row HTML using the provided function
        body.appendChild(tr); // Append the row to the table body
      }
    } finally {
      this.table.hidden = false; // Ensure the table is visible after populating
    }
  }
}

// For backwards compatibility with existing code
window.Table = Table;
