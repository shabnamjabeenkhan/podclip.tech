import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const audioUrl = url.searchParams.get('url');
  
  if (!audioUrl) {
    return new Response('Missing audio URL parameter', { status: 400 });
  }

  try {
    // Validate that it's from a trusted source
    const audioUrlObj = new URL(audioUrl);
    const allowedHosts = [
      'audio.listennotes.com',
      'open.live.bbc.co.uk',
      'traffic.libsyn.com',
      'audio.simplecast.com',
      'dts.podtrac.com',
      'chrt.fm',
      'chtbl.com',
      'play.podtrac.com'
    ];
    
    if (!allowedHosts.some(host => audioUrlObj.hostname.includes(host))) {
      return new Response('Audio URL not from allowed host', { status: 403 });
    }

    // Fetch the audio file with timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(audioUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PodClip/1.0 (https://podclip.tech)',
        'Accept': 'audio/*,*/*;q=0.1',
        'Accept-Encoding': 'identity', // Disable compression for audio streaming
        'Connection': 'keep-alive',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(`Failed to fetch audio: ${response.status}`, { status: response.status });
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    
    // Create response headers for audio streaming
    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Handle range requests for audio seeking
    const range = request.headers.get('range');
    if (range && response.body) {
      // For now, just return the full audio
      // Proper range handling would require more complex logic
      return new Response(response.body, {
        status: 200,
        headers,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });

  } catch (error) {
    console.error('Audio proxy error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Response('Audio request timed out', { status: 408 });
      }
      if (error.message.includes('fetch')) {
        return new Response(`Network error: ${error.message}`, { status: 502 });
      }
    }
    
    return new Response(`Failed to proxy audio: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}