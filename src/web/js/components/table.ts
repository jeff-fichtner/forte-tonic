/**
 *
 */

interface TableOptions<T extends object = Record<string, unknown>> {
  pagination?: boolean;
  itemsPerPage?: number;
  pageSizeOptions?: number[] | null;
  rowClassFunction?: ((row: T) => string | null) | null;
  onCountChange?: ((filteredCount: number, totalCount: number) => void) | null;
}

interface FilterChange {
  filterId: string;
  type: string;
}

interface TableHTMLElement extends HTMLElement {
  _clickHandler?: (event: Event) => void;
}

interface FilterHTMLElement extends HTMLElement {
  _changeHandler?: (event: Event) => void;
}

export class Table<T extends object = Record<string, unknown>> {
  table: TableHTMLElement;
  pagination: boolean;
  itemsPerPage: number;
  pageSizeOptions: number[] | null;
  currentPage: number;
  rowClassFunction: ((row: T) => string | null) | null;
  onCountChange: ((filteredCount: number, totalCount: number) => void) | null;
  filterFunction: ((row: T) => boolean) | null;
  rowFunction: (row: T) => string;
  paginationContainer: HTMLDivElement | undefined;
  rows: T[] = [];

  /**
   *
   */
  constructor(
    tableId: string,
    headers: string[],
    rowFunction: (row: T) => string,
    initialRows: T[] | null = null,
    onClickFunction: ((event: Event) => void) | null = null,
    filterFunction: ((row: T) => boolean) | null = null,
    onFilterChanges: FilterChange[] | null = null,
    options: TableOptions<T> = {}
  ) {
    this.table = document.getElementById(tableId) as TableHTMLElement;
    this.table.innerHTML = ''; // Clear existing content
    this.pagination = options.pagination || false;
    this.itemsPerPage = options.itemsPerPage || 1000;
    this.pageSizeOptions = options.pageSizeOptions || null;
    this.currentPage = 1;
    this.rowClassFunction = options.rowClassFunction || null; // New parameter for row CSS classes
    this.onCountChange = options.onCountChange || null; // Callback for when filtered count changes

    const head = document.createElement('thead'); // Create a new table header if not found

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
      // Clean up any existing pagination containers to prevent duplicates
      const existingPagination = (this.table.parentNode as HTMLElement).querySelector(
        '.pagination-container'
      );
      if (existingPagination) {
        existingPagination.remove();
      }

      this.paginationContainer = document.createElement('div');
      this.paginationContainer.className = 'pagination-container center-align';
      this.paginationContainer.style.marginTop = '20px';
      (this.table.parentNode as HTMLElement).insertBefore(
        this.paginationContainer,
        this.table.nextSibling
      );
    }

    if (initialRows) {
      this.replaceRange(initialRows); // Populate the table with initial rows
    }

    // Remove old click handler if it exists
    if (this.table._clickHandler) {
      this.table.removeEventListener('click', this.table._clickHandler);
    }

    // Create and store new click handler
    this.table._clickHandler = (event: Event) => {
      if (onClickFunction) onClickFunction(event);
    };
    this.table.addEventListener('click', this.table._clickHandler);

    // Remove old filter handlers if they exist
    if (onFilterChanges && onFilterChanges.length > 0) {
      for (const onFilterChange of onFilterChanges) {
        const filterElement = document.getElementById(
          onFilterChange.filterId
        ) as FilterHTMLElement | null;
        if (filterElement && filterElement._changeHandler) {
          filterElement.removeEventListener('change', filterElement._changeHandler);
        }

        // Create and store new filter handler
        if (filterElement) {
          filterElement._changeHandler = (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (onFilterChange.type === 'checkbox' && target.type !== onFilterChange.type) {
              return;
            }
            if (onFilterChange.type === 'select-multiple' && target.tagName !== 'SELECT') {
              return;
            }
            // re-render registrations (reset to page 1 when filtering)
            this.currentPage = 1;
            this.refresh();
          };
          filterElement.addEventListener('change', filterElement._changeHandler);
        }
      }
    }
  }
  /**
   *
   */
  refresh(): void {
    // Re-render the table with the current rows
    this.replaceRange(this.rows);
  }

  /**
   * Create pagination controls
   */
  createPaginationControls(totalPages: number): void {
    if (!this.pagination || !this.paginationContainer) return;

    this.paginationContainer.innerHTML = '';

    // Create page size selector if options are provided
    if (this.pageSizeOptions && this.pageSizeOptions.length > 0) {
      const pageSizeContainer = document.createElement('div');
      pageSizeContainer.className = 'page-size-selector';
      pageSizeContainer.style.marginBottom = '15px';

      const label = document.createElement('span');
      label.textContent = 'Items per page: ';
      label.style.marginRight = '10px';

      const select = document.createElement('select');
      select.className = 'browser-default';
      select.style.display = 'inline-block';
      select.style.width = 'auto';
      select.style.minWidth = '80px';

      this.pageSizeOptions.forEach(size => {
        const option = document.createElement('option');
        option.value = String(size);
        option.textContent = String(size);
        option.selected = size === this.itemsPerPage;
        select.appendChild(option);
      });

      select.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.itemsPerPage = parseInt(target.value);
        this.currentPage = 1; // Reset to first page
        this.refresh();
      });

      pageSizeContainer.appendChild(label);
      pageSizeContainer.appendChild(select);
      this.paginationContainer.appendChild(pageSizeContainer);
    }

    // Only show page navigation if there are multiple pages
    if (totalPages <= 1) {
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'pagination';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = this.currentPage === 1 ? 'disabled' : 'waves-effect';
    const prevA = document.createElement('a');
    prevA.href = '#!';
    prevA.innerHTML = '<i class="material-icons">chevron_left</i>';
    prevA.addEventListener('click', (e: Event) => {
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
      a.textContent = String(i);
      a.addEventListener('click', (e: Event) => {
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
    nextA.addEventListener('click', (e: Event) => {
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
  replaceRange(rows: T[]): void {
    this.rows = rows;
    const body = this.table.querySelector('tbody') as HTMLTableSectionElement;
    body.innerHTML = ''; // Clear existing rows

    try {
      if (!rows || rows.length === 0) {
        // Call count callback with zero
        if (this.onCountChange) {
          this.onCountChange(0, 0);
        }
        // no rows message
        if (this.pagination) {
          this.createPaginationControls(0);
        }
        return;
      }

      // Filter rows first
      const filteredRows = rows.filter((row: T) => {
        if (this.filterFunction && !this.filterFunction(row)) {
          return false;
        }
        return true;
      });

      // Call count callback if provided
      if (this.onCountChange) {
        this.onCountChange(filteredRows.length, rows.length);
      }

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

        // Apply custom CSS classes if the rowFunction provides them
        if (this.rowClassFunction) {
          const cssClass = this.rowClassFunction(row);
          if (cssClass) {
            tr.className = cssClass;
          }
        }

        body.appendChild(tr); // Append the row to the table body
      }
    } finally {
      this.table.hidden = false; // Ensure the table is visible after populating
    }
  }
}
