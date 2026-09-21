import { describe, expect, it } from 'vitest';
import { richText } from './richText';

describe('richText', () => {
  it('renders bold and italic', () => {
    expect(richText('**Bold:** and *italic*')).toBe('<strong>Bold:</strong> and <em>italic</em>');
  });

  it('escapes HTML so data files cannot inject markup', () => {
    expect(richText('<script>x</script> & "q"')).toBe(
      '&lt;script&gt;x&lt;/script&gt; &amp; &quot;q&quot;',
    );
  });
});
