import { prisma } from "@/lib/prisma";
import MatchBoard from "@/components/features/MatchBoard";
import FAB from "@/components/ui/FAB";
import styles from "../page.module.css";


// I'll define a server component.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const matches = await prisma.match.findMany({
    include: {
      hostUser: true,
      hostTeam: true,
      guestUser: true,
      guestTeam: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  return (
    <main className={`container ${styles.main}`}>
      <div className={styles.grid}>
        <MatchBoard initialMatches={JSON.parse(JSON.stringify(matches))} />
      </div>
      <FAB />
    </main>
  );
}
