import { FaqSection } from "~/components/ui/faq-section";

const FAQ_ITEMS = [
  {
    question: "Can I chat with AI about any podcast episode?",
    answer:
      "Yes! Our AI chat feature lets you ask questions about any episode you've summarized. Get deeper insights, clarifications, and explore topics further.",
  },
  {
    question: "Can I delete my account and data?",
    answer:
      "Yes, you can contact us at admin@podclip.tech to request account deletion. We'll permanently remove your data in accordance with our privacy policy.",
  },
  {
    question: "How accurate are the AI-generated summaries?",
    answer:
      "Our AI achieves 95%+ accuracy by using advanced language models specifically trained for podcast content. Each summary is structured to capture the most important insights, key takeaways, and actionable information.",
  },
  {
    question: "When will Notion integration be available?",
    answer:
      "Notion integration is currently in development. Once launched, you'll be able to export summaries directly to your Notion workspace as pages or database entries. ",
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