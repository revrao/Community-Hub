import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="about">This opportunity or page is unavailable.</p>
      <Link href="/" className="btn">
        Back to Explore
      </Link>
    </div>
  );
}
