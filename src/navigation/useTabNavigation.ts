import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppTab } from '../context/AppDataContext';
import { pathToTab, tabToPath } from './tabRoutes';

export function useTabNavigation(
  activeTab: AppTab,
  setActiveTab: (tab: AppTab) => void,
) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = pathToTab(location.pathname);
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname, activeTab, setActiveTab]);

  const navigateToTab = useCallback(
    (tab: AppTab) => {
      setActiveTab(tab);
      navigate(tabToPath(tab));
    },
    [navigate, setActiveTab],
  );

  return { navigateToTab };
}
