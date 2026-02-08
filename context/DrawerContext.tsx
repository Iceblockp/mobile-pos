import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';

/**
 * Drawer context type definition
 * Provides methods to control drawer state (open/closed)
 */
interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

/**
 * Create the drawer context
 * Initially undefined to enforce provider usage
 */
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider component props
 */
interface DrawerProviderProps {
  children: ReactNode;
}

/**
 * DrawerProvider component
 * Wraps the application to provide drawer state management
 * Optimized with useCallback to prevent unnecessary re-renders (Requirement 8.4)
 *
 * @param children - Child components that need access to drawer state
 */
export function DrawerProvider({ children }: DrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Memoize callbacks to prevent recreation on every render (Requirement 8.4)
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  const drawerContext: DrawerContextType = {
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };

  return (
    <DrawerContext.Provider value={drawerContext}>
      {children}
    </DrawerContext.Provider>
  );
}

/**
 * Custom hook for accessing drawer state
 * Must be used within a DrawerProvider
 *
 * @throws Error if used outside of DrawerProvider
 * @returns DrawerContextType with drawer state and control methods
 */
export function useDrawer(): DrawerContextType {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error(
      'useDrawer must be used within a DrawerProvider. ' +
        'Wrap your component tree with <DrawerProvider>.',
    );
  }

  return context;
}
