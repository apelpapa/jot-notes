export default function ServiceUnavailable() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <section className="card w-full max-w-lg bg-base-100 shadow-xl" role="alert">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-2xl">Jot Notes is temporarily unavailable</h1>
          <p>We could not reach the note service. Please try again in a few minutes.</p>
          <div className="card-actions mt-3">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
