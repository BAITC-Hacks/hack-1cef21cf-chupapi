import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <p>Let’s find your next opportunity.</p>
      <Link href="/challenges" className="button primary">
        Explore challenges
      </Link>
    </div>
  );
}
