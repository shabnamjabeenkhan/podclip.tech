import type { MetaFunction } from 'react-router';
import { CursorfulVideo } from '~/components/video/cursorful-video';

export const meta: MetaFunction = () => {
  return [
    { title: 'Demo - Podclip' },
    { name: 'description', content: 'Watch our Podclip demo recording' },
  ];
};

export default function Demo() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Product Demo
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Watch our interactive demo to see how Podclip works in action.
        </p>
      </div>
      
      <CursorfulVideo
        title="Podclip Platform Walkthrough"
        description="Complete demonstration of the Podclip platform features and capabilities"
        controls={true}
        className="mb-8"
      />
    </div>
  );
}