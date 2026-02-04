'use client';

interface NextStepAction {
  label: string;
  description: string;
  href?: string | undefined;
  onClick?: (() => void) | undefined;
  icon: string;
}

interface WhatsNextProps {
  context: 'stories-empty' | 'stories-list' | 'editor' | 'play' | 'play-end';
  storyId?: string | undefined;
  hasChanges?: boolean | undefined;
  onAction?: ((action: string) => void) | undefined;
}

/**
 * Contextual "What's Next" hints that appear at the bottom of pages.
 * Provides gentle guidance without being intrusive.
 */
export function WhatsNext({ context, storyId, hasChanges, onAction }: WhatsNextProps) {
  const actions = getActionsForContext(context, storyId, hasChanges, onAction);

  if (actions.length === 0) return null;

  return (
    <div className="whats-next">
      <div className="whats-next-header">
        <span className="whats-next-icon">💡</span>
        <span className="whats-next-title">What's next?</span>
      </div>
      <div className="whats-next-actions">
        {actions.map((action, idx) => (
          <WhatsNextAction key={idx} action={action} />
        ))}
      </div>
    </div>
  );
}

function WhatsNextAction({ action }: { action: NextStepAction }) {
  if (action.href) {
    return (
      <a href={action.href} className="whats-next-action">
        <span className="whats-next-action-icon">{action.icon}</span>
        <div className="whats-next-action-content">
          <span className="whats-next-action-label">{action.label}</span>
          <span className="whats-next-action-description">{action.description}</span>
        </div>
        <span className="whats-next-action-arrow">→</span>
      </a>
    );
  }

  return (
    <button onClick={action.onClick} className="whats-next-action">
      <span className="whats-next-action-icon">{action.icon}</span>
      <div className="whats-next-action-content">
        <span className="whats-next-action-label">{action.label}</span>
        <span className="whats-next-action-description">{action.description}</span>
      </div>
      <span className="whats-next-action-arrow">→</span>
    </button>
  );
}

function getActionsForContext(
  context: WhatsNextProps['context'],
  storyId?: string | undefined,
  hasChanges?: boolean | undefined,
  onAction?: ((action: string) => void) | undefined
): NextStepAction[] {
  switch (context) {
    case 'stories-empty':
      return [
        {
          label: 'Play the demo',
          description: 'See what StoryGraph can do',
          href: '/play/demo',
          icon: '🎮',
        },
        {
          label: 'Read the docs',
          description: 'Learn YAML story format',
          href: 'https://github.com/mcp-tool-shop-org/StoryGraph#readme',
          icon: '📚',
        },
      ];

    case 'stories-list':
      return [
        {
          label: 'Play the demo',
          description: 'Experience an interactive story',
          href: '/play/demo',
          icon: '🎮',
        },
      ];

    case 'editor': {
      const editorActions: NextStepAction[] = [];
      if (hasChanges) {
        editorActions.push({
          label: 'Save your work',
          description: 'Press Ctrl+S or click Save',
          onClick: () => onAction?.('save'),
          icon: '💾',
        });
      }
      if (storyId) {
        editorActions.push({
          label: 'Test your story',
          description: 'See how it plays',
          href: `/play/${storyId}`,
          icon: '▶️',
        });
        editorActions.push({
          label: 'View history',
          description: 'Browse past versions',
          href: `/edit/${storyId}/versions`,
          icon: '📜',
        });
      }
      return editorActions;
    }

    case 'play': {
      const playActions: NextStepAction[] = [];
      if (storyId && storyId !== 'demo') {
        playActions.push({
          label: 'Edit this story',
          description: 'Make changes in the editor',
          href: `/edit/${storyId}`,
          icon: '✏️',
        });
      }
      playActions.push({
        label: 'Save your progress',
        description: 'Come back where you left off',
        onClick: () => onAction?.('save-game'),
        icon: '💾',
      });
      return playActions;
    }

    case 'play-end': {
      const endActions: NextStepAction[] = [
        {
          label: 'Play again',
          description: 'Try different choices',
          onClick: () => onAction?.('restart'),
          icon: '🔄',
        },
      ];
      if (storyId && storyId !== 'demo') {
        endActions.push({
          label: 'Edit this story',
          description: 'Make changes in the editor',
          href: `/edit/${storyId}`,
          icon: '✏️',
        });
      }
      endActions.push({
        label: 'Browse stories',
        description: 'Find another adventure',
        href: '/',
        icon: '📖',
      });
      return endActions;
    }

    default:
      return [];
  }
}
