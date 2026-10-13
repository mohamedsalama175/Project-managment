import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { apiClient } from '../api/client';

export const startInteractiveTour = (onCompleted?: () => void) => {
  const steps: DriveStep[] = [
    {
      element: '#nav-project-switcher',
      popover: {
        title: 'Project Switcher & Templates',
        description:
          'Switch between isolated projects, create new projects, or instantiate turnkey delivery frameworks from our 6 System Templates.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#nav-views-tabs',
      popover: {
        title: 'Workspace Navigation',
        description:
          'Access the WBS & Gantt Planner, Team Directory & RBAC Roles, System Configuration, and Executive Overview Dashboard.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#planner-wbs-container',
      popover: {
        title: 'Work Breakdown Structure (WBS)',
        description:
          'Manage task hierarchies, assign team owners, specify dependencies, set working-day durations, and log actual progress.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#planner-gantt-container',
      popover: {
        title: 'Interactive Gantt Timeline',
        description:
          'Visualize scheduled execution with interactive milestone diamonds, dependency arrows, and adjustable day/week/month zoom scales.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#planner-critical-path-btn',
      popover: {
        title: 'Critical Path Engine (CPM)',
        description:
          'Toggle topological critical path analysis to highlight zero-float tasks that directly dictate your target project delivery date.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#nav-risks-btn',
      popover: {
        title: 'Risk & Impediment Register',
        description:
          'Proactively track delivery risks, assumptions, and critical blockers with root-cause tracking and accountable mitigation owners.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#nav-org-profile',
      popover: {
        title: 'Organization & User Settings',
        description:
          'Manage multi-tenant memberships, invite team members, configure Spatie RBAC permissions, and switch tenant organizations.',
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  // Filter steps to only include elements that currently exist in the DOM
  const activeSteps = steps.filter((step) => {
    if (typeof step.element === 'string') {
      return document.querySelector(step.element) !== null;
    }
    return true;
  });

  const tourDriver = driver({
    showProgress: true,
    animate: true,
    steps: activeSteps.length > 0 ? activeSteps : steps,
    onDestroyed: () => {
      // Mark tour completed in backend onboarding state
      apiClient
        .completeOnboardingTour()
        .then(() => {
          if (onCompleted) onCompleted();
        })
        .catch(() => {
          if (onCompleted) onCompleted();
        });
    },
  });

  tourDriver.drive();
};
