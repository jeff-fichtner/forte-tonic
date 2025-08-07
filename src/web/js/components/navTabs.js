/**
 *
 */
export class NavTabs {
  /**
   *
   */
  constructor(defaultSection) {
    const tabsContainer = document.querySelector('.tabs');
    const tabs = document.querySelectorAll('.tabs .tab');
    const tabLinks = document.querySelectorAll('.tabs .tab a');
    const tabContents = document.querySelectorAll('.tab-content');
    const links = document.querySelectorAll('.section-link');
    if (!tabsContainer || tabs.length === 0) return;
    tabsContainer.addEventListener('click', event => {
      event.preventDefault();
      // return if not a tab link
      const tabLink = event.target.closest('.tab a');
      if (!tabLink) return;
      const targetTab = tabLink.getAttribute('href');
      const targetContent = document.querySelector(targetTab);
      // Remove active class from all tabs and add it to the clicked tab
      tabLinks.forEach(t => {
        t.classList.toggle('active', t.getAttribute('href') === tabLink.getAttribute('href'));
      });
      // Toggle all tab contents
      tabContents.forEach(content => {
        content.hidden = content.id !== targetContent.id;
      });
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
        console.log(`Nav link clicked: ${dataSection}`);
        
        // Keep the active state toggle functionality
        links.forEach(l =>
          l.classList.toggle('active', l.getAttribute('data-section') === dataSection)
        );
        
        // Show toast message with the selected section
        const sectionName = dataSection.charAt(0).toUpperCase() + dataSection.slice(1);
        M.toast({ 
          html: `${sectionName} section selected`, 
          classes: 'blue darken-1', 
          displayLength: 2000 
        });
      });
    });
    // Initialize first nav link as active for visual consistency
    if (links.length > 0) {
      const firstLink = links[0];
      firstLink.classList.add('active');
    }
  }
}

// For backwards compatibility with existing code
window.NavTabs = NavTabs;
