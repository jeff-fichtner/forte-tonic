import { PeriodType } from '/utils/values/periodType.js';
import { UserType } from '/utils/values/userType.js';
import { isEnrollmentPeriod } from '../utilities/periodHelpers.js';
import { UserSession } from '../auth/session.js';
import { getTabController } from '../core/tabControllerInstance.js';

/**
 *
 */
export class NavTabs {
  #currentUser: Record<string, unknown> | null = null;

  setCurrentUser(user: Record<string, unknown> | null): void {
    this.#currentUser = user;
  }

  /**
   *
   */
  constructor(defaultSection: string) {
    const tabsContainer = document.querySelector<HTMLElement>('.tabs');
    const tabs = document.querySelectorAll<HTMLElement>('.tabs .tab');
    const tabLinks = document.querySelectorAll<HTMLAnchorElement>('.tabs .tab a');
    const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');
    const links = document.querySelectorAll<HTMLAnchorElement>('.section-link');

    if (!tabsContainer || tabs.length === 0) {
      console.warn('No tabs container or tabs found - NavTabs not initialized');
      return;
    }
    tabsContainer.addEventListener('click', async (event: Event) => {
      // return if not a tab link
      const tabLink = (event.target as HTMLElement).closest<HTMLAnchorElement>('.tab a');
      if (!tabLink) return;
      event.preventDefault();

      // Get the tab href and target content
      const targetTab = tabLink.getAttribute('href');
      const targetContent = document.querySelector<HTMLElement>(targetTab!);

      if (!targetContent) {
        console.warn(`No content found for tab: ${targetTab}`);
        return;
      }

      // Remove active class from all tabs and add it to the clicked tab
      tabLinks.forEach((t: HTMLAnchorElement) => {
        t.classList.toggle('active', t.getAttribute('href') === tabLink.getAttribute('href'));
      });

      // Phase 2: Check if this tab is registered with TabController
      const tabId = targetContent.id;
      const tc = getTabController();
      const isTabControllerRegistered = tc && tc.isTabRegistered(tabId);

      if (isTabControllerRegistered) {
        try {
          // Get session info from current user state
          const currentUser = this.#currentUser;
          const sessionInfo = currentUser
            ? {
                user: currentUser,
                userType: currentUser.admin
                  ? UserType.ADMIN
                  : currentUser.instructor
                    ? UserType.INSTRUCTOR
                    : UserType.PARENT,
              }
            : null;

          // Update TabController session if needed
          if (sessionInfo) {
            tc.updateSession(sessionInfo);
          }

          // Hide all tab contents first
          tabContents.forEach((content: HTMLElement) => {
            content.hidden = true;
          });

          // Show the target tab content (TabController will populate it)
          targetContent.hidden = false;

          // Activate the tab via TabController (fetches data and renders)
          await tc.activateTab(tabId);
        } catch (error) {
          console.error(`Error activating tab ${tabId} via TabController:`, error);
          // Fallback: just show the content without TabController
          targetContent.hidden = false;
        }
      } else {
        // Old behavior for non-migrated tabs
        tabContents.forEach((content: HTMLElement) => {
          content.hidden = content.id !== targetContent.id;
        });
      }

      // Show/hide admin trimester selector based on tab AND period type
      // Trimester selector should only show for admin-specific tabs during enrollment periods
      // Hide for directory tab, non-admin tabs, and non-enrollment periods
      // CRITICAL: Trimester selector is ADMIN-ONLY and ENROLLMENT-PERIOD-ONLY
      const adminTrimesterSelector = document.getElementById('admin-trimester-selector-container');
      if (adminTrimesterSelector) {
        const isAdmin = !!this.#currentUser?.admin;
        const currentPeriod = UserSession?.getCurrentPeriod();

        const adminTrimesterTabs = [
          '#admin-master-schedule',
          '#admin-wait-list',
          '#admin-registration',
        ];
        const shouldShowAdminTrimester =
          adminTrimesterTabs.includes(targetTab!) && isAdmin && isEnrollmentPeriod(currentPeriod);
        adminTrimesterSelector.hidden = !shouldShowAdminTrimester;
      }

      // Show/hide instructor trimester selector based on tab AND period type
      // Trimester selector should only show for instructor-specific tabs during enrollment periods
      const instructorTrimesterSelector = document.getElementById(
        'instructor-trimester-selector-container'
      );
      if (instructorTrimesterSelector) {
        const isInstructor = !!this.#currentUser?.instructor;
        const currentPeriod = UserSession?.getCurrentPeriod();

        const instructorTrimesterTabs = ['#instructor-weekly-schedule'];
        const shouldShowInstructorTrimester =
          instructorTrimesterTabs.includes(targetTab!) &&
          isInstructor &&
          isEnrollmentPeriod(currentPeriod);
        instructorTrimesterSelector.hidden = !shouldShowInstructorTrimester;
      }

      // Force layout refresh when switching tabs to fix scroll/rendering issues
      setTimeout(() => {
        this.#forceTabContentRefresh(targetContent);
      }, 10);
    });
    if (links.length === 0) {
      console.warn(`No links found.`);
      return;
    }
    links.forEach((link: HTMLAnchorElement) => {
      link.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        const dataSection = link.getAttribute('data-section');

        // Show the main content when access is granted
        this.#showContent();

        // Show/hide tabs based on selected section
        this.#showTabsForSection(dataSection!);

        // Initialize section-specific UI (trimester selector for admin)
        this.#initializeSectionUI(dataSection!);

        // Auto-click the first tab within this section to show content
        await this.#activateFirstTabInSection(dataSection!);

        // Force layout reflow and scroll reset to fix rendering issues
        this.#forceLayoutRefresh(dataSection!);

        // Keep the active state toggle functionality
        links.forEach((l: HTMLAnchorElement) =>
          l.classList.toggle('active', l.getAttribute('data-section') === dataSection)
        );
      });
    });
    // Initialize first nav link as active for visual consistency
    if (links.length > 0) {
      const firstLink = links[0];
      firstLink.classList.add('active');
    }
  }

  /**
   * Force layout refresh and scroll reset to fix rendering issues when switching sections
   * @param {string} section - The section that was just activated
   */
  #forceLayoutRefresh(section: string): void {
    // Reset scroll position to top
    window.scrollTo(0, 0);

    // Force immediate layout reflow by reading layout properties
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      // Trigger reflow by reading offsetHeight (forces browser to recalculate layout)
      void pageContent.offsetHeight;

      // Also force reflow on the main container
      const container = document.querySelector<HTMLElement>('.container');
      if (container) {
        void container.offsetHeight;
      }
    }

    // Force reflow specifically on the active tab content
    setTimeout(() => {
      const sectionFirstTabs: Record<string, string> = {
        admin: '#admin-master-schedule',
        instructor: '#instructor-weekly-schedule',
        parent: '#parent-weekly-schedule',
      };

      const firstTabHref = sectionFirstTabs[section];
      if (firstTabHref) {
        const activeTabContent = document.querySelector<HTMLElement>(firstTabHref);
        if (activeTabContent && !activeTabContent.hidden) {
          // Force reflow on the tab content
          void activeTabContent.offsetHeight;

          // Find any tables in the content and force reflow on them too
          const tables = activeTabContent.querySelectorAll<HTMLTableElement>('table');
          tables.forEach((table: HTMLTableElement) => {
            if (!table.hidden) {
              void table.offsetHeight;

              // If this is a MaterializeCSS table, reinitialize it
              if (window.M && window.M.updateTextFields) {
                window.M.updateTextFields();
              }
            }
          });
        }
      }
    }, 10); // Small delay to ensure DOM updates are complete

    // Additional scroll reset after a longer delay to ensure all content is rendered
    setTimeout(() => {
      window.scrollTo(0, 0);

      // Also try scrolling the main container and document body to fix any scroll lock issues
      const container = document.querySelector<HTMLElement>('.container');
      if (container) {
        container.scrollTop = 0;
      }

      // Reset body scroll as well
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;

      // Fix any potential CSS overflow issues that can cause scroll lock
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        // Temporarily reset overflow to ensure scrollability
        const originalOverflow = pageContent.style.overflow;
        pageContent.style.overflow = 'visible';

        // Then restore it after a brief moment
        setTimeout(() => {
          pageContent.style.overflow = originalOverflow;
        }, 50);
      }
    }, 100);
  }

  /**
   * Force refresh of specific tab content to fix rendering issues
   * @param {Element} tabContent - The tab content element that was just shown
   */
  #forceTabContentRefresh(tabContent: HTMLElement): void {
    if (!tabContent || tabContent.hidden) return;

    // Reset scroll to top when switching tabs
    window.scrollTo(0, 0);

    // Force reflow on the tab content
    void tabContent.offsetHeight;

    // Find any tables and force reflow on them
    const tables = tabContent.querySelectorAll<HTMLTableElement>('table');
    tables.forEach((table: HTMLTableElement) => {
      if (!table.hidden) {
        void table.offsetHeight;

        // For tables with complex content, also check their parent containers
        const tableContainer = table.closest<HTMLElement>('.card, .card-content, .row, .col');
        if (tableContainer) {
          void tableContainer.offsetHeight;
        }
      }
    });

    // Reinitialize any MaterializeCSS components in the newly shown content
    if (window.M) {
      // Update form elements
      if (window.M.updateTextFields) {
        window.M.updateTextFields();
      }

      // Reinitialize any dropdowns, modals, etc. in this tab
      const selects = tabContent.querySelectorAll<HTMLSelectElement>('select');
      if (selects.length > 0) {
        window.M.FormSelect.init(selects);
      }
    }
  }

  /**
   * Show/hide tabs based on the selected section
   * @param {string} section - The section that was selected ('admin', 'instructor', 'parent')
   */
  #showTabsForSection(section: string): void {
    // First show the tabs container
    const tabsContainer = document.querySelector<HTMLElement>('.tabs');
    if (tabsContainer) {
      tabsContainer.hidden = false;
    }

    // Hide all tabs first
    const allTabs = document.querySelectorAll<HTMLElement>('.tabs .tab');
    allTabs.forEach((tab: HTMLElement) => {
      tab.style.display = 'none';
    });

    // Show only tabs for the selected section
    const sectionTabs = document.querySelectorAll<HTMLElement>(`.tabs .tab.${section}-tab`);
    sectionTabs.forEach((tab: HTMLElement) => {
      tab.style.display = '';
    });

    // Hide registration tab for parents during intent period
    if (section === 'parent') {
      const currentPeriod = UserSession?.getCurrentPeriod();
      const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

      if (isIntentPeriod) {
        const registrationTab = document
          .querySelector<HTMLAnchorElement>('a[href="#parent-registration"]')
          ?.closest<HTMLElement>('.tab');
        if (registrationTab) {
          registrationTab.style.display = 'none';
        }
      }
    }

    // Reinitialize Materialize tabs to update the indicator
    if (tabsContainer && window.M && window.M.Tabs) {
      window.M.Tabs.init(tabsContainer);
    } else {
      console.warn('Could not reinitialize Materialize tabs');
    }
  }

  /**
   * Initialize section-specific UI components
   * @param {string} section - The section that was selected ('admin', 'instructor', 'parent')
   */
  #initializeSectionUI(section: string): void {
    if (section === 'admin') {
      const isAdmin = !!this.#currentUser?.admin;
      const currentPeriod = UserSession?.getCurrentPeriod();
      const appConfig = UserSession?.getAppConfig();

      const trimesterSelector = document.getElementById('admin-trimester-selector-container');

      // Only show trimester selector during enrollment periods
      if (trimesterSelector && isAdmin && isEnrollmentPeriod(currentPeriod)) {
        trimesterSelector.hidden = false;

        // Populate trimester buttons dynamically from availableTrimesters
        const trimesterButtons = document.getElementById('admin-trimester-buttons');
        if (trimesterButtons && appConfig?.availableTrimesters) {
          // Only populate if buttons don't exist yet
          if (trimesterButtons.children.length === 0) {
            (appConfig.availableTrimesters as string[]).forEach((trimester: string) => {
              const button = document.createElement('button');
              button.className = 'trimester-btn';
              button.setAttribute('data-trimester', trimester);
              button.textContent = trimester.charAt(0).toUpperCase() + trimester.slice(1);
              trimesterButtons.appendChild(button);
            });
          }

          // Set default active button to current trimester if none active
          const activeButton = trimesterButtons.querySelector('.trimester-btn.active');
          if (!activeButton && currentPeriod?.trimester) {
            const currentButton = trimesterButtons.querySelector(
              `[data-trimester="${currentPeriod.trimester}"]`
            );
            if (currentButton) {
              currentButton.classList.add('active');
            }
          }
        }
      } else if (trimesterSelector) {
        // Hide trimester selector during non-enrollment periods
        trimesterSelector.hidden = true;
      }
    }

    if (section === 'instructor') {
      const isInstructor = !!this.#currentUser?.instructor;
      const currentPeriod = UserSession?.getCurrentPeriod();
      const appConfig = UserSession?.getAppConfig();

      const trimesterSelector = document.getElementById('instructor-trimester-selector-container');

      // Only show trimester selector during enrollment periods
      if (trimesterSelector && isInstructor && isEnrollmentPeriod(currentPeriod)) {
        trimesterSelector.hidden = false;

        // Populate trimester buttons dynamically from availableTrimesters
        const trimesterButtons = document.getElementById('instructor-trimester-buttons');
        if (trimesterButtons && appConfig?.availableTrimesters) {
          // Only populate if buttons don't exist yet
          if (trimesterButtons.children.length === 0) {
            (appConfig.availableTrimesters as string[]).forEach((trimester: string) => {
              const button = document.createElement('button');
              button.className = 'trimester-btn';
              button.setAttribute('data-trimester', trimester);
              button.textContent = trimester.charAt(0).toUpperCase() + trimester.slice(1);
              trimesterButtons.appendChild(button);
            });
          }

          // Set default active button to current trimester if none active
          const activeButton = trimesterButtons.querySelector('.trimester-btn.active');
          if (!activeButton && currentPeriod?.trimester) {
            const currentButton = trimesterButtons.querySelector(
              `[data-trimester="${currentPeriod.trimester}"]`
            );
            if (currentButton) {
              currentButton.classList.add('active');
            }
          }
        }
      } else if (trimesterSelector) {
        // Hide trimester selector during non-enrollment periods
        trimesterSelector.hidden = true;
      }
    }
  }

  /**
   * Activate the first tab within a section when access is granted
   * @param {string} section - The section that was accessed
   */
  async #activateFirstTabInSection(section: string): Promise<void> {
    // Define mapping of sections to their first tab
    const sectionFirstTabs: Record<string, string> = {
      admin: '#admin-master-schedule',
      instructor: '#instructor-weekly-schedule',
      parent: '#parent-weekly-schedule',
    };

    const firstTabHref = sectionFirstTabs[section];

    if (firstTabHref) {
      const firstTabLink = document.querySelector<HTMLAnchorElement>(`a[href="${firstTabHref}"]`);

      if (firstTabLink) {
        // Check if the tab link is visible
        const tabParent = firstTabLink.closest<HTMLElement>('.tab');
        if (tabParent) {
          // Make sure the tab is visible
          if (tabParent.hidden) {
            tabParent.hidden = false;
          }
        }

        // Hide all tab contents first
        const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');
        tabContents.forEach((content: HTMLElement) => {
          content.hidden = true;
        });

        // Show the target tab content
        const targetContent = document.querySelector<HTMLElement>(firstTabHref);

        if (targetContent) {
          targetContent.hidden = false;

          // Phase 2: Try to activate via TabController if registered
          const tabId = targetContent.id;
          const tc2 = getTabController();
          const isRegistered = tc2 && tc2.isTabRegistered(tabId);

          if (isRegistered) {
            const currentUser = this.#currentUser;
            const sessionInfo = currentUser
              ? {
                  user: currentUser,
                  userType: currentUser.admin
                    ? UserType.ADMIN
                    : currentUser.instructor
                      ? UserType.INSTRUCTOR
                      : UserType.PARENT,
                }
              : null;

            if (sessionInfo) {
              tc2.updateSession(sessionInfo);
            }

            // Add active class to the tab link BEFORE activating
            const allTabLinks = document.querySelectorAll<HTMLAnchorElement>('.tabs .tab a');
            allTabLinks.forEach((link: HTMLAnchorElement) => {
              link.classList.remove('active');
            });
            firstTabLink.classList.add('active');

            // Activate the tab via TabController (await to ensure it completes)
            try {
              await tc2.activateTab(tabId);
            } catch (error) {
              console.error(`Error activating first tab ${tabId}:`, error);
            }

            // Update Materialize tabs indicator without triggering click
            const tabsContainer = document.querySelector<HTMLElement>('.tabs');
            if (tabsContainer && window.M && window.M.Tabs) {
              const tabsInstance = window.M.Tabs.getInstance(tabsContainer);
              if (tabsInstance) {
                // Update the indicator to the correct tab
                const tabIdForMaterialize = firstTabLink.getAttribute('href')!.substring(1);
                tabsInstance.select(tabIdForMaterialize);
              }
            }

            // Force table visibility for admin tabs
            if (section === 'admin') {
              setTimeout(() => {
                const table = document.getElementById('master-schedule-table');
                if (table && table.hidden) {
                  table.hidden = false;
                }
              }, 50);
            }
          } else {
            // Fallback for non-TabController tabs: just click
            // Add active class to the clicked tab link
            const allTabLinks = document.querySelectorAll<HTMLAnchorElement>('.tabs .tab a');
            allTabLinks.forEach((link: HTMLAnchorElement) => {
              link.classList.remove('active');
            });
            firstTabLink.classList.add('active');

            // Simulate the click for Materialize's indicator
            firstTabLink.click();

            // Ensure table is visible after tab click for admin tabs
            if (section === 'admin') {
              setTimeout(() => {
                const table = document.getElementById('master-schedule-table');
                if (table && table.hidden) {
                  table.hidden = false;
                }
              }, 50);
            }
          }
        }
      } else {
        console.warn(`First tab link not found for section ${section}: ${firstTabHref}`);
      }
    }
  }

  /**
   * Show the main content when access is granted
   */
  #showContent(): void {
    // Show all main content
    const pageContent = document.getElementById('page-content');
    const pageLoading = document.getElementById('page-loading-container');
    const pageError = document.getElementById('page-error-content');

    if (pageContent) pageContent.hidden = false;
    if (pageLoading) pageLoading.hidden = true; // Hide loading
    if (pageError) pageError.hidden = true; // Hide errors
  }
}
