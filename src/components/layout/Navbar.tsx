import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    VERSUS
                </Link>
                <div className={styles.actions}>
                    {/* Future: User Profile / Login Button */}
                </div>
            </div>
        </nav>
    );
}
