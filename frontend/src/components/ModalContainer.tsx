import type { JSX } from "react"

interface ModalContainerProps{
    children:JSX.Element
}

export default function ModalContainer({ children }: ModalContainerProps){
    return(
        <div className="fixed top-0 bottom-0 left-0 right-0 bg-black/40 w-full h-full flex justify-center items-center">
            <div className=" max-w-11/12 max-h-2/3 bg-base-200 flex justify-center items-center">
                {children}
            </div>
        </div>
    )
}