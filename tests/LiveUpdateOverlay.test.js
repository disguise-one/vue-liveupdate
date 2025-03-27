import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LiveUpdateOverlay from '../src/components/LiveUpdateOverlay.vue';

describe('LiveUpdateOverlay', () => {
  it('renders the overlay when not connected', () => {
    const mockLiveUpdate = {
      status: { value: 'CLOSED' },
      connectionUserInfo: 'User: TestUser',
      reconnect: vi.fn(),
    };

    const wrapper = mount(LiveUpdateOverlay, {
      props: { liveUpdate: mockLiveUpdate },
    });

    expect(wrapper.find('.overlay').exists()).toBe(true);
    expect(wrapper.find('.overlay-content').text()).toContain(
      'Live Update is not connected. Please check your connection.'
    );
    expect(wrapper.find('.connection-user-info').text()).toBe('User: TestUser');
  });

  it('does not render the overlay when connected', () => {
    const mockLiveUpdate = {
      status: { value: 'OPEN' },
      connectionUserInfo: 'User: TestUser',
      reconnect: vi.fn(),
    };

    const wrapper = mount(LiveUpdateOverlay, {
      props: { liveUpdate: mockLiveUpdate },
    });

    expect(wrapper.find('.overlay').exists()).toBe(false);
  });

  it('calls the reconnect method when the button is clicked', async () => {
    const mockLiveUpdate = {
      status: { value: 'CLOSED' },
      connectionUserInfo: 'User: TestUser',
      reconnect: vi.fn(),
    };

    const wrapper = mount(LiveUpdateOverlay, {
      props: { liveUpdate: mockLiveUpdate },
    });

    const button = wrapper.find('button');
    await button.trigger('click');

    expect(mockLiveUpdate.reconnect).toHaveBeenCalled();
  });
});