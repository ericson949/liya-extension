import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarSyncUI, ConversationSyncInfo } from '@features/capture/infrastructure/ui/sidebar-sync.ui';
import { SidebarConversationItem } from '@features/capture/ports/platform-extractor.strategy';
import { getI18n } from '@shared/utils/i18n';

describe('SidebarSyncUI — 3-Level Conversation Sync Indicator', () => {
  let ui: SidebarSyncUI;
  let container: HTMLElement;
  let item: SidebarConversationItem;

  beforeEach(() => {
    ui = new SidebarSyncUI();
    container = document.createElement('div');
    container.innerHTML = `<span class="title">Guide d'éducation canine positive</span><button class="options">⋮</button>`;
    document.body.appendChild(container);

    item = {
      conversationId: 'conv-123',
      title: "Guide d'éducation canine positive",
      containerElement: container,
    };
  });

  it('renders Level 1 (NONE) when 0 messages are synchronized', () => {
    const t = getI18n();
    const info: ConversationSyncInfo = {
      level: 'NONE',
      syncedTurns: 0,
      totalTurns: 0,
    };

    ui.renderSyncIndicator(item, info);

    const host = container.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    expect(host).toBeTruthy();

    const shadow = (host as any)._synapseShadow;
    expect(shadow).toBeTruthy();

    const wrapper = shadow.querySelector('.icon-wrapper');
    expect(wrapper.className).toContain('level-none');
    expect(shadow.innerHTML).toContain('shield-svg');
    expect(shadow.innerHTML).toContain(t.sidebarSyncNone);
  });

  it('renders Level 2 (PARTIAL) when some messages are synchronized', () => {
    const t = getI18n();
    const info: ConversationSyncInfo = {
      level: 'PARTIAL',
      syncedTurns: 2,
      totalTurns: 5,
    };

    ui.renderSyncIndicator(item, info);

    const host = container.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    const shadow = (host as any)._synapseShadow;
    const wrapper = shadow.querySelector('.icon-wrapper');

    expect(wrapper.className).toContain('level-partial');
    expect(shadow.innerHTML).toContain(t.sidebarSyncPartial(2, 5));
  });

  it('renders Level 3 (FULL) when all messages are synchronized', () => {
    const t = getI18n();
    const info: ConversationSyncInfo = {
      level: 'FULL',
      syncedTurns: 5,
      totalTurns: 5,
    };

    ui.renderSyncIndicator(item, info);

    const host = container.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    const shadow = (host as any)._synapseShadow;
    const wrapper = shadow.querySelector('.icon-wrapper');

    expect(wrapper.className).toContain('level-full');
    expect(shadow.innerHTML).toContain(t.sidebarSyncFull);
  });

  it('correctly centers sync badge horizontally and vertically in ChatGPT sidebar row without wrapping below text', () => {
    const chatgptSidebarRow = document.createElement('a');
    chatgptSidebarRow.className = 'group __menu-item';
    chatgptSidebarRow.innerHTML = `
      <div class="flex min-w-0 grow items-center gap-2.5">
        <div class="truncate [&:has([data-marquee-text])]:min-w-0 [&:has([data-marquee-text])]:flex-1 [&:has([data-marquee-text])]:overflow-visible">
          <span dir="auto" class="_NCija_viewport block w-full min-w-0 whitespace-nowrap" data-marquee-text="true" draggable="false">
            <span class="_NCija_clipViewport"><span class="_NCija_track"><span class="_NCija_content">Analyse du post LinkedIn</span></span></span>
          </span>
        </div>
      </div>
      <div class="trailing highlight flex min-w-4 shrink-0 items-center justify-center self-stretch">
        <div class="flex items-center gap-2">
          <button data-trailing-button=""></button>
        </div>
      </div>
    `;
    document.body.appendChild(chatgptSidebarRow);

    const sidebarItem: SidebarConversationItem = {
      conversationId: '6ab11a4c-474c-83ea-8039-6b2065ce3be6',
      title: 'Analyse du post LinkedIn',
      containerElement: chatgptSidebarRow,
    };

    ui.renderSyncIndicator(sidebarItem, {
      level: 'NONE',
      syncedTurns: 0,
      totalTurns: 0,
    });

    const host = chatgptSidebarRow.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    expect(host).toBeTruthy();

    // 1. Host must be a direct child of the flex container (div.flex.grow.items-center)
    const flexTitleRow = chatgptSidebarRow.querySelector('.flex.min-w-0.grow.items-center') as HTMLElement;
    expect(host.parentElement).toBe(flexTitleRow);

    // 2. Host must NOT be inside the truncate wrapper or inside the block span!
    const truncateWrapper = chatgptSidebarRow.querySelector('.truncate') as HTMLElement;
    expect(truncateWrapper.querySelector('.synapse-sidebar-sync-host')).toBeNull();
  });

  it('ensures conversation with captured turn displays Level PARTIAL or FULL and never NONE (0 messages)', () => {
    const t = getI18n();

    // 1 captured turn out of 1
    const infoFull: ConversationSyncInfo = {
      level: 'FULL',
      syncedTurns: 1,
      totalTurns: 1,
    };
    ui.renderSyncIndicator(item, infoFull);

    let host = container.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    let shadow = (host as any)._synapseShadow;
    let wrapper = shadow.querySelector('.icon-wrapper');
    expect(wrapper.className).toContain('level-full');
    expect(shadow.innerHTML).toContain(t.sidebarSyncFull);
    expect(shadow.innerHTML).not.toContain(t.sidebarSyncNone);

    // 1 captured turn out of 3
    const infoPartial: ConversationSyncInfo = {
      level: 'PARTIAL',
      syncedTurns: 1,
      totalTurns: 3,
    };
    ui.renderSyncIndicator(item, infoPartial);

    host = container.querySelector('.synapse-sidebar-sync-host') as HTMLElement;
    shadow = (host as any)._synapseShadow;
    wrapper = shadow.querySelector('.icon-wrapper');
    expect(wrapper.className).toContain('level-partial');
    expect(shadow.innerHTML).toContain(t.sidebarSyncPartial(1, 3));
    expect(shadow.innerHTML).not.toContain(t.sidebarSyncNone);
  });
});
