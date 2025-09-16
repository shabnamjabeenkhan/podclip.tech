import { CursorfulVideo } from '~/components/video/cursorful-video';

export default function DemoSection() {
  return (
    <section className="relative w-full py-16 md:py-32">
      {/* Background Effects - removed */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
      </div>
      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            See Podclip in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch our interactive demo to see how Podclip transforms your podcast experience
          </p>
        </div>
        
        <CursorfulVideo
          title="Podclip Platform Demo"
          description="Complete walkthrough of AI-powered podcast summaries and key takeaways"
          controls={true}
        />
      </div>
    </section>
  );
}