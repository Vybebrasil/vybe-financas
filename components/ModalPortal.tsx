import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** z-index acima do header (z-50). */
  zIndexClass?: string;
}

/**
 * Renderiza modal no document.body para não ser cortado por ancestors com transform
 * (ex.: animate-bar-grow no main) e bloqueia scroll da página.
 */
const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  zIndexClass = 'z-[100]',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex flex-col`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pt-20 sm:pt-24 pb-6">
        <div className="flex min-h-full items-center justify-center">
          <div className="relative w-full flex justify-center my-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ModalPortal;
