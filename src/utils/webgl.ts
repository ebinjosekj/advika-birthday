export interface WebGLInfo {
  supported: boolean;
  renderer?: string;
}

export function detectWebGL(): WebGLInfo {
  try {
    if (new URLSearchParams(location.search).get('nowebgl') === '1') return { supported: false };
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { supported: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true, renderer };
  } catch {
    return { supported: false };
  }
}
