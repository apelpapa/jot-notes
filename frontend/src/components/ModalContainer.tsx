import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

interface ModalContainerProps{
    children: ReactNode;
    ariaLabel: string;
}

const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

export default function ModalContainer({ children, ariaLabel }: ModalContainerProps){
    const overlayRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const overlay = overlayRef.current;
        const dialog = dialogRef.current;
        if (!overlay || !dialog) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const siblingStates = Array.from(document.body.children)
            .filter((element) => element !== overlay)
            .map((element) => ({
                element: element as HTMLElement,
                ariaHidden: element.getAttribute("aria-hidden"),
                inert: (element as HTMLElement).inert,
            }));

        siblingStates.forEach(({ element }) => {
            element.inert = true;
            element.setAttribute("aria-hidden", "true");
        });

        const focusFrame = window.requestAnimationFrame(() => {
            (getFocusableElements(dialog)[0] ?? dialog).focus();
        });

        return () => {
            window.cancelAnimationFrame(focusFrame);
            siblingStates.forEach(({ element, ariaHidden, inert }) => {
                element.inert = inert;
                if (ariaHidden === null) {
                    element.removeAttribute("aria-hidden");
                } else {
                    element.setAttribute("aria-hidden", ariaHidden);
                }
            });
            previouslyFocused?.focus();
        };
    }, []);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Tab" || !dialogRef.current) return;

        const dialog = dialogRef.current;
        const focusableElements = getFocusableElements(dialog);
        if (focusableElements.length === 0) {
            event.preventDefault();
            dialog.focus();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    return(
        <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/40 w-full h-full flex justify-center items-center">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="max-w-11/12 max-h-[90vh] overflow-y-auto rounded-box bg-base-200 flex justify-center items-center"
            >
                {children}
            </div>
        </div>
    )
}
