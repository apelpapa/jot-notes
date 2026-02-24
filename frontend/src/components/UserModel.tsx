interface UserModalProps{
    onClose: () => void 
}

export default function UserModal({ onClose }: UserModalProps){
    return(
        <>
        <div className="bg-100 p-3">
            <div>
                <p>Current User Info</p>

            </div>
            <button onClick={onClose} className="btn">Close</button>
            <button className="btn btn-error">Logout</button>
        </div>
        </>
    )
}