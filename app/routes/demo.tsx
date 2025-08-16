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
      
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">What you'll see in this demo:</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>• Platform overview and navigation</li>
          <li>• Key features and functionality</li>
          <li>• User interface walkthrough</li>
          <li>• Real-time capabilities demonstration</li>
        </ul>
      </div>
    </div>
  );
}