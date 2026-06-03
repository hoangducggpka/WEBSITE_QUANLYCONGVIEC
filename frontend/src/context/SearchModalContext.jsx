import { createContext, useContext, useState } from "react";

const SearchModalContext = createContext();

export function SearchModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <SearchModalContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchModalContext.Provider>
  );
}

export const useSearchModal = () => useContext(SearchModalContext);