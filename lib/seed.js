import { emptyCard } from "./schema.js";
import { demoAnswers } from "./ai.js";
import { calculateReadinessScore } from "./readiness-score.js";
export const teams = [
  { name: "DLX", skills: "AI · Full-stack", color: "blue" },
  { name: "NOVA", skills: "Computer vision · Python", color: "purple" },
  { name: "GreenByte", skills: "IoT · Sustainability", color: "green" },
  { name: "Orbit", skills: "Data science · Analytics", color: "orange" },
  { name: "Pixel Pioneers", skills: "Design · Frontend", color: "pink" },
];
const full = { ...emptyCard(), ...demoAnswers };
const cards = [
  {
    ...full,
    users: "Store managers, baristas",
    constraints: "Browser only; 4 weeks; anonymized data.",
  },
  {
    ...full,
    title: "Smart Waste Management",
    industry: "Smart City",
    context:
      "Our city district manages public recycling bins across parks, residential streets and public markets.",
    problem:
      "Bins overflow before scheduled collection while trucks visit some locations that are nearly empty.",
    data: "Anonymized collection logs and weekly bin observations for 120 locations, provided as CSV exports.",
    expectedResult:
      "Build a prototype dashboard that prioritizes collection routes using bin observations and service history.",
    successCriteria:
      "Cut overflow reports by 20% in a pilot, comparing weekly reports against the previous month.",
    users: "Dispatchers and collection crews",
    constraints: "Use existing city fleet",
    contact: "City pilot lead: waste@example.test",
    collaboration: "Weekly video calls",
    skills: "IoT, mapping, analytics",
  },
  {
    ...full,
    title: "Customer Churn Prediction",
    industry: "FinTech",
    context:
      "Our subscription finance education service supports individual learners through monthly paid memberships.",
    problem:
      "We cannot identify subscribers who need support before they cancel their monthly learning plan.",
    data: "Six months of anonymized subscription and activity CSV exports, with cancellation labels and access notes.",
    expectedResult:
      "Deliver a churn-risk prototype with an explainable dashboard that support staff can use each week.",
    successCriteria: "Recall of 80% on held-out data",
    users: "Customer success team",
    constraints: "Anonymized data only",
    contact: null,
    collaboration: "Weekly check-in",
    skills: "Python, machine learning, analytics",
  },
  {
    ...full,
    title: "School Attendance Analytics",
    industry: "Education",
    context:
      "Our school tracks attendance in several spreadsheets and teachers spend too much time creating summaries.",
    problem:
      "Teachers struggle to spot recurring absences and need a clear weekly view to plan student support.",
    data: "Anonymized attendance CSV",
    expectedResult: "A weekly attendance dashboard",
    successCriteria: "Save teacher time",
    users: "Teachers and administrators",
    constraints: "Student privacy",
    contact: null,
    collaboration: null,
    skills: "Data visualization, React",
  },
  {
    ...emptyCard(),
    title: "Improve Our Website",
    industry: "Retail",
    context: "We run a small online shop",
    problem:
      "Customers find our website confusing and we want to make browsing and checkout easier for visitors.",
    expectedResult: "A website prototype",
    users: "Online shoppers",
    skills: "UX, frontend",
  },
];
export function seedDatabase() {
  const challenges = cards.map((card, i) => ({
    id: "challenge-" + (i + 1),
    card,
    description: card.problem,
    status: "published",
    createdAt: new Date(Date.UTC(2026, 8, 20 - i)).toISOString(),
    initialScore: 12 + i * 3,
    interviewScore: calculateReadinessScore(card).total,
    owner: [
      "Demo Coffee",
      "Green District",
      "FinLearn",
      "Bright School",
      "Studio Market",
    ][i],
  }));
  const drafts = cards.map((card, i) => ({
    id: "draft-" + (i + 1),
    card: {
      ...emptyCard(),
      title: card.title + " — draft",
      problem: card.problem,
      context: i > 2 ? null : card.context,
      data: i === 0 ? card.data : null,
    },
    description: card.problem,
    status: "draft",
    createdAt: new Date(Date.UTC(2026, 8, 21 - i)).toISOString(),
    initialScore: 6,
    interviewScore: 12,
    owner: "Your business",
  }));
  return {
    version: 1,
    challenges: [...challenges, ...drafts],
    proposals: teams.map((team, i) => ({
      id: "proposal-" + i,
      challengeId: "challenge-" + (i < 2 ? 1 : i),
      teamName: team.name,
      submittedBy: i === 0 ? "demo-student" : team.name,
      idea: [
        "A demand forecasting dashboard for morning staffing.",
        "Queue measurement and actionable staffing recommendations.",
        "A route planning prototype using collection logs.",
        "An explainable model that highlights subscribers needing support.",
        "A simple dashboard for weekly attendance trends.",
      ][i],
      plan: "Understand the supplied data, build a small prototype, validate against the success criteria and review with the business.",
      duration: i % 2 ? "3 weeks" : "2 weeks",
      link: "",
      status: "Pending",
      createdAt: "2026-09-22T10:00:00Z",
    })),
  };
}
