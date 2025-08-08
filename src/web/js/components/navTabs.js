/**
 *
 */
export class NavTabs {
  /**
   *
   */
  constructor(defaultSection) {
    console.log('🚀 NavTabs constructor called with defaultSection:', defaultSection);
    
    const tabsContainer = document.querySelector('.tabs');
    const tabs = document.querySelectorAll('.tabs .tab');
    const tabLinks = document.querySelectorAll('.tabs .tab a');
    const tabContents = document.querySelectorAll('.tab-content');
    const links = document.querySelectorAll('.section-link');
    
    console.log(`Found ${tabs.length} tabs, ${links.length} section links`);
    console.log('Navigation links visible:', links.length > 0 ? !links[0].closest('#nav-mobile').hidden : 'No links found');
    
    if (!tabsContainer || tabs.length === 0) {
      console.warn('No tabs container or tabs found - NavTabs not initialized');
      return;
    }
    tabsContainer.addEventListener('click', event => {
      event.preventDefault();
      // return if not a tab link
      const tabLink = event.target.closest('.tab a');
      if (!tabLink) return;
      
      // Get the tab href and target content
      const targetTab = tabLink.getAttribute('href');
      const targetContent = document.querySelector(targetTab);
      
      console.log(`Tab clicked with href: ${targetTab}`);
      
      if (!targetContent) {
        console.warn(`No content found for tab: ${targetTab}`);
        return;
      }
      
      // Remove active class from all tabs and add it to the clicked tab
      tabLinks.forEach(t => {
        t.classList.toggle('active', t.getAttribute('href') === tabLink.getAttribute('href'));
      });
      
      // Hide all tab contents
      tabContents.forEach(content => {
        const wasHidden = content.hidden;
        content.hidden = content.id !== targetContent.id;
        if (wasHidden && !content.hidden) {
          console.log(`📋 Showing tab content: ${content.id}`);
        } else if (!wasHidden && content.hidden) {
          console.log(`📋 Hiding tab content: ${content.id}`);
        }
      });
      
      // Ensure the table in the target content is visible if it exists
      if (targetTab === '#admin-master-schedule') {
        const masterTable = document.getElementById('master-schedule-table');
        if (masterTable) {
          masterTable.hidden = false;
          console.log('Ensuring master schedule table is visible');
        }
      }
    });
    if (links.length === 0) {
      console.warn(`No links found.`);
      return;
    }
    links.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const dataSection = link.getAttribute('data-section');
        
        // Console log the nav link click
        console.log(`🖱️ Nav link clicked: ${dataSection}`);
        
        // Check if operator has access to this section
        if (!this.#checkOperatorAccess(dataSection)) {
          console.log(`🚫 Access denied for section: ${dataSection}`);
          
          // Hide all content and show login state
          this.#hideContentShowLogin(dataSection);
          return;
        }
        
        console.log(`✅ Access granted for section: ${dataSection}`);
        
        // Show the main content when access is granted
        this.#showContent();
        
        // Show/hide tabs based on selected section
        this.#showTabsForSection(dataSection);
        
        // Auto-click the first tab within this section to show content
        this.#activateFirstTabInSection(dataSection);
        
        // Keep the active state toggle functionality
        links.forEach(l =>
          l.classList.toggle('active', l.getAttribute('data-section') === dataSection)
        );
        
        // Debug: Log table visibility after permission granted
        setTimeout(() => {
          const table = document.getElementById('master-schedule-table');
          if (table) {
            console.log(`Master schedule table hidden status: ${table.hidden}`);
          } else {
            console.log('Master schedule table not found');
          }
        }, 100);
      });
    });
    // Initialize first nav link as active for visual consistency
    if (links.length > 0) {
      const firstLink = links[0];
      firstLink.classList.add('active');
    }
  }

  /**
   * Check if the current operator has access to the requested section
   * @param {string} section - The section to check ('admin', 'instructor', 'parent')
   * @returns {boolean} True if operator has access to this section
   */
  #checkOperatorAccess(section) {
    // Get the operator user from global session
    const operatorUser = window.UserSession?.getOperatorUser();
    
    if (!operatorUser) {
      console.log('No operator user found in session');
      return false;
    }

    // Check if operator has the required user type
    switch (section) {
      case 'admin':
        return operatorUser.isAdmin && operatorUser.isAdmin();
      case 'instructor':
        return operatorUser.isInstructor && operatorUser.isInstructor();
      case 'parent':
        return operatorUser.isParent && operatorUser.isParent();
      default:
        console.warn(`Unknown section: ${section}`);
        return false;
    }
  }

  /**
   * Show/hide tabs based on the selected section
   * @param {string} section - The section that was selected ('admin', 'instructor', 'parent')
   */
  #showTabsForSection(section) {
    console.log(`🔄 #showTabsForSection called with section: ${section}`);
    
    // First show the tabs container
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
      tabsContainer.hidden = false;
    }
    
    // Hide all tabs first
    const allTabs = document.querySelectorAll('.tabs .tab');
    console.log(`Found ${allTabs.length} total tabs to hide`);
    allTabs.forEach(tab => {
      tab.hidden = true;
    });
    
    // Show only tabs for the selected section
    const sectionTabs = document.querySelectorAll(`.tabs .tab.${section}-tab`);
    console.log(`Found ${sectionTabs.length} tabs with class '${section}-tab'`);
    sectionTabs.forEach(tab => {
      tab.hidden = false;
      console.log(`Showing tab:`, tab);
    });
    
    console.log(`✅ Showing ${sectionTabs.length} tabs for ${section} section`);
    
    // Reinitialize Materialize tabs to update the indicator
    if (tabsContainer && window.M && window.M.Tabs) {
      console.log('🔄 Reinitializing Materialize tabs');
      window.M.Tabs.init(tabsContainer);
    } else {
      console.warn('❌ Could not reinitialize Materialize tabs');
    }
  }

  /**
   * Activate the first tab within a section when access is granted
   * @param {string} section - The section that was accessed
   */
  #activateFirstTabInSection(section) {
    // Define mapping of sections to their first tab
    const sectionFirstTabs = {
      'admin': '#admin-master-schedule',
      'instructor': '#instructor-weekly-schedule', 
      'parent': '#parent-weekly-schedule'
    };
    
    const firstTabHref = sectionFirstTabs[section];
    if (firstTabHref) {
      const firstTabLink = document.querySelector(`a[href="${firstTabHref}"]`);
      if (firstTabLink) {
        console.log(`🎯 Auto-clicking first tab in ${section} section: ${firstTabHref}`);
        
        // Check if the tab link is visible
        const tabParent = firstTabLink.closest('.tab');
        if (tabParent) {
          console.log(`Tab parent hidden status: ${tabParent.hidden}`);
          
          // Make sure the tab is visible
          if (tabParent.hidden) {
            tabParent.hidden = false;
            console.log(`Made tab parent visible for first click`);
          }
        }
        
        // Hide all tab contents first
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          content.hidden = true;
        });
        
        // Show the target tab content
        const targetContent = document.querySelector(firstTabHref);
        if (targetContent) {
          targetContent.hidden = false;
          console.log(`📋 Showing tab content: ${targetContent.id}`);
        }
        
        // Add active class to the clicked tab link
        const allTabLinks = document.querySelectorAll('.tabs .tab a');
        allTabLinks.forEach(link => {
          link.classList.remove('active');
        });
        firstTabLink.classList.add('active');
        
        // Simulate the click for Materialize's indicator
        firstTabLink.click();
        
        // Debug: Check table visibility after tab click
        setTimeout(() => {
          const table = document.getElementById('master-schedule-table');
          const tabContent = document.getElementById('admin-master-schedule');
          
          if (table) {
            console.log(`📊 After tab click - Master schedule table hidden: ${table.hidden}`);
            // Make sure the table is visible if we're in admin section
            if (section === 'admin' && table.hidden) {
              table.hidden = false;
              console.log('📊 Forcing master schedule table to be visible');
            }
          }
          if (tabContent) {
            console.log(`📋 After tab click - Admin master schedule content hidden: ${tabContent.hidden}`);
          }
        }, 50);
      } else {
        console.warn(`First tab link not found for section ${section}: ${firstTabHref}`);
      }
    }
  }

  /**
   * Show the main content when access is granted
   */
  #showContent() {
    // Show all main content
    const pageContent = document.getElementById('page-content');
    const pageLoading = document.getElementById('page-loading-container');
    const pageError = document.getElementById('page-error-content');
    
    if (pageContent) pageContent.hidden = false;
    if (pageLoading) pageLoading.hidden = true; // Hide loading
    if (pageError) pageError.hidden = true; // Hide errors
    
    console.log('Main content shown');
  }

  /**
   * Hide all content and show login state when access is denied
   * @param {string} section - The section that was denied access
   */
  #hideContentShowLogin(section) {
    // Hide all main content
    const pageContent = document.getElementById('page-content');
    const pageLoading = document.getElementById('page-loading-container');
    const pageError = document.getElementById('page-error-content');
    
    if (pageContent) pageContent.hidden = true;
    if (pageLoading) pageLoading.hidden = true;
    if (pageError) pageError.hidden = true;

    // Show a message that login is required
    const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
    M.toast({ 
      html: `Please log in to access ${sectionName} section`, 
      classes: 'orange darken-2', 
      displayLength: 4000 
    });

    // Remove active state from all nav links
    const links = document.querySelectorAll('.section-link');
    links.forEach(link => link.classList.remove('active'));

    console.log(`Content hidden due to unauthorized access to ${section} section`);
  }
}

// For backwards compatibility with existing code
window.NavTabs = NavTabs;
