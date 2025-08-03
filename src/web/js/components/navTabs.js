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
        const tabSectionClass = `${dataSection}-tab`;
        tabs.forEach(section => {
          section.style.display = section.classList.contains(tabSectionClass)
            ? 'inline-block'
            : 'none';
        });
        const showingTabs = document.getElementsByClassName(tabSectionClass);
        if (showingTabs.length === 0) {
          console.warn(`No tabs found for section: ${sectionId}`);
          return;
        }
        // reinitialize tabs for the newly displayed section
        M.Tabs.init(tabsContainer);
        links.forEach(l =>
          l.classList.toggle('active', l.getAttribute('data-section') === dataSection)
        );
        // initialize first tab within the section
        const firstTabLink = showingTabs[0]?.querySelector('a');
        if (firstTabLink) {
          firstTabLink.click();
        }
      });
    });
    // find matching item
    const defaultLink = Array.from(links).find(
      link => !defaultSection || link.getAttribute('data-section') === defaultSection
    );
    if (defaultLink) {
      defaultLink.click();
    } else {
      console.warn(`No link found for default section: ${defaultSection}`);
    }
  }
}

// For backwards compatibility with existing code
window.NavTabs = NavTabs;
