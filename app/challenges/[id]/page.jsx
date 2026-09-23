import { Detail } from "@/components/detail";
export default async function ChallengePage({ params }) {
  const { id } = await params;
  return <Detail id={id} />;
}
