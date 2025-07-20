import { FaqSection } from "~/components/ui/faq-section";

const FAQ_ITEMS = [
  {
    question: "How does Podclip preserve the original speaker's voice?",
    answer:
      "Our AI maintains the essence and tone of the original speakers while condensing content into digestible summaries. We focus on preserving key quotes, important phrases, and the speaker's unique insights to ensure authenticity.",
  },
  {
    question: "What type of podcasts work best with PODCLIP?",
    answer:
      "Podclip excels with educational, interview-based, and informational podcasts. Content-rich shows like research discussions, expert interviews, news analysis, and professional development podcasts produce the most valuable summaries.",
  },
  {
    question: "How accurate are the AI-generated summaries?",
    answer:
      "Our AI achieves 95%+ accuracy by using advanced language models specifically trained for podcast content. Each summary is structured to capture the most important insights, key takeaways, and actionable information.",
  },
  {
    question: "Can I export my summaries to other tools?",
    answer:
      "Absolutely! Summaries automatically sync to your Notion workspace. ",
  },
];

export default function FAQ() {
  return (
    <FaqSection
      title="Frequently Asked Questions"
      items={FAQ_ITEMS}
    />
  );
} 