'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CardHoverEffect } from '~/components/ui/pulse-card';
import {
  Globe,
  Users,
  Heart,
  Lightbulb,
  Sparkles,
  Rocket,
  Target,
} from 'lucide-react';

interface AboutUsProps {
  values?: Array<{
    title: string;
    description: string;
    icon: keyof typeof iconComponents;
  }>;
  className?: string;
}

const iconComponents = {
  Users: Users,
  Heart: Heart,
  Lightbulb: Lightbulb,
  Globe: Globe,
  Sparkles: Sparkles,
  Rocket: Rocket,
  Target: Target,
};

const defaultValues: AboutUsProps['values'] = [
  {
    title: 'Precision',
    description:
      'Our AI captures every episode\'s core ideas and moments, condensing even the most complex podcasts into clear, concise summaries with precise timestamps for easy reference.',
    icon: 'Target',
  },
  {
    title: 'Intelligence',
    description:
      'Cutting-edge AI extracts actionable insights directly from episode content, complete with real-life examples and practical scenarios. Each insight includes why it matters and specific implementation steps derived from the podcast discussion.',
    icon: 'Lightbulb',
  },
  {
    title: 'Efficiency',
    description:
      'Save time—instantly receive digestible highlights and timestamped key points, so you spend less time listening and more time executing your next big idea.',
    icon: 'Rocket',
  },
  {
    title: 'Entrepreneur Focus',
    description:
      'Tailored for founders and business builders, Podclip delivers on-demand market insights and growth opportunities to keep you one step ahead.',
    icon: 'Globe',
  },
];

export default function AboutUs1() {
  const aboutData = {
    values: defaultValues,
    className: 'relative overflow-hidden py-20',
  };

  const valuesRef = useRef(null);

  const valuesInView = useInView(valuesRef, { once: true, amount: 0.3 });

  return (
    <section className="relative w-full overflow-hidden pt-20">
      {/* Background Effects - removed */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">


        <div ref={valuesRef} className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-12 text-center"
          >
            <h2 className="from-foreground/80 via-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Why Choose Podclip
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              The core advantages that make Podclip the ultimate podcast intelligence platform.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 items-stretch">
            {aboutData.values?.map((value, index) => {
              const IconComponent = iconComponents[value.icon];

              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={
                    valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                  }
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1 + 0.2,
                    ease: 'easeOut',
                  }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="h-full"
                >
                  <CardHoverEffect
                    icon={<IconComponent className="h-6 w-6" />}
                    title={value.title}
                    description={value.description}
                    variant="emerald"
                    glowEffect={false}
                    size="lg"
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
