import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function NotionConnection() {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.467l13.212-.535c.467 0 .7.233.7.7 0 .233-.066.467-.233.7L18.26 7.31c-.167.3-.367.234-.6.234l-13.056.467c-.266 0-.467-.167-.467-.434 0-.2.067-.4.234-.567l.088-.8zm.7 2.8l13.212-.534c.4 0 .534.234.534.6 0 .167-.067.4-.2.534l-3.267 3.266c-.167.167-.434.234-.7.234H4.592c-.367 0-.6-.234-.6-.6 0-.167.066-.334.2-.467l.967-2.6c.133-.4.266-.433.6-.433zm-.233 3.533l13.212-.533c.4 0 .667.2.667.533 0 .134-.067.334-.2.467l-3.267 3.267c-.166.166-.433.233-.7.233H4.926c-.367 0-.6-.233-.6-.6 0-.166.067-.333.2-.466l.967-2.6c.133-.334.266-.467.6-.467z"/>
          </svg>
          Notion Integration
        </CardTitle>
        <CardDescription>
          Export your podcast summaries and takeaways to Notion pages or databases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coming Soon Message */}
        <div className="flex items-center justify-center p-8 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coming Soon
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Notion Integration</h3>
              <p className="text-sm text-blue-700 max-w-md">
                Export your podcast summaries directly to Notion pages and databases. 
                This feature is currently in development and will be available soon.
              </p>
            </div>
            <div className="text-xs text-blue-600 space-y-1 pt-2">
              <p><strong>Upcoming features:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Export summaries as new Notion pages</li>
                <li>Add summaries to existing pages</li>
                <li>Export to Notion databases</li>
                <li>Automatically format takeaways as bullet points</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}