export default function UserModal(){
    return(
        <>
        <div className="bg-100 p-3">
            <div>
                <p>Current User Info</p>

            </div>
            <button className="btn">Close</button>
            <button className="btn btn-error">Logout</button>
        </div>
        </>
    )
}