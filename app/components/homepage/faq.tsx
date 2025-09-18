'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mail } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.15,
        ease: 'easeOut',
      }}
      className={cn(
        'group border-white/20 rounded-lg border',
        'transition-all duration-200 ease-in-out',
        isOpen ? 'bg-transparent' : 'hover:bg-transparent',
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4"
      >
        <h3
          className={cn(
            'text-left text-sm sm:text-base font-medium transition-colors duration-200',
            'text-white/90',
            isOpen && 'text-white',
          )}
        >
          {question}
        </h3>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1,
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={cn(
            'shrink-0 rounded-full p-0.5',
            'transition-colors duration-200',
            isOpen ? 'text-green-400' : 'text-white/60',
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: {
                  duration: 0.4,
                  ease: [0.04, 0.62, 0.23, 0.98],
                },
                opacity: {
                  duration: 0.25,
                  delay: 0.1,
                },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  duration: 0.3,
                  ease: 'easeInOut',
                },
                opacity: {
                  duration: 0.25,
                },
              },
            }}
          >
            <div className="border-white/20 border-t px-4 sm:px-6 pt-2 pb-3 sm:pb-4">
              <motion.p
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                className="text-white/80 text-xs sm:text-sm leading-relaxed"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const FAQ_ITEMS: Omit<FAQItemProps, 'index'>[] = [
  {
    question: "Who is Podclip designed for?",
    answer:
      "Podclip is designed for anyone who listens to podcasts and wants to save time while retaining key information. However, our actionable insights feature is specifically optimized for business and entrepreneurship podcasts, providing strategic takeaways that professionals can implement immediately.",
  },
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
      "Notion integration is currently in development. Once launched, you'll be able to export summaries directly to your Notion workspace as pages or database entries.",
  },
];

export default function FAQ() {
  return (
    <section className="relative w-full overflow-hidden py-12 sm:py-16 md:py-20">
      {/* Background Effects - matching pricing section */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/10 absolute -top-[10%] left-[50%] h-[40%] w-[60%] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute -bottom-[10%] -left-[10%] h-[40%] w-[40%] rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-8 sm:mb-10 md:mb-12 max-w-2xl text-center"
        >
          <Badge
            variant="outline"
            className="border-primary mb-3 sm:mb-4 px-2 sm:px-3 py-1 text-xs font-medium tracking-wider uppercase"
          >
            FAQs
          </Badge>
          <h2 className="from-primary mb-2 sm:mb-3 bg-gradient-to-r to-secondary bg-clip-text text-2xl sm:text-3xl md:text-4xl font-bold text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base px-4 sm:px-0">
            Everything you need to know about Podclip
          </p>
        </motion.div>

        <div className="mx-auto max-w-2xl space-y-1.5 sm:space-y-2">
          {FAQ_ITEMS.map((faq, index) => (
            <FAQItem key={index} {...faq} index={index} />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={cn('mx-auto mt-12 max-w-md rounded-lg p-6 text-center')}
        >
          <div className="bg-primary/10 text-primary mb-4 inline-flex items-center justify-center rounded-full p-2">
            <Mail className="h-4 w-4" />
          </div>
          <p className="text-foreground mb-1 text-sm font-medium">
            Still have questions?
          </p>
          <p className="text-muted-foreground mb-4 text-xs">
            We&apos;re here to help you
          </p>
          <button
            type="button"
            className={cn(
              'rounded-md px-4 py-2 text-sm',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'transition-colors duration-200',
              'font-medium',
            )}
            onClick={() => window.location.href = 'mailto:admin@podclip.tech'}
          >
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  );
} 