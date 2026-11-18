// Pixel icons from pixelarticons (MIT, Gerrit Halfmann). Only the icons below are bundled.
import i_menu from 'pixelarticons/svg/menu.svg?raw';
import i_close from 'pixelarticons/svg/close.svg?raw';
import i_chevron_right from 'pixelarticons/svg/chevron-right.svg?raw';
import i_chevron_left from 'pixelarticons/svg/chevron-left.svg?raw';
import i_chevron_down from 'pixelarticons/svg/chevron-down.svg?raw';
import i_chevron_up from 'pixelarticons/svg/chevron-up.svg?raw';
import i_arrow_right from 'pixelarticons/svg/arrow-right.svg?raw';
import i_arrow_left from 'pixelarticons/svg/arrow-left.svg?raw';
import i_arrow_up from 'pixelarticons/svg/arrow-up.svg?raw';
import i_download from 'pixelarticons/svg/download.svg?raw';
import i_external from 'pixelarticons/svg/external-link.svg?raw';
import i_copy from 'pixelarticons/svg/copy.svg?raw';
import i_check from 'pixelarticons/svg/check.svg?raw';
import i_search from 'pixelarticons/svg/search.svg?raw';
import i_link from 'pixelarticons/svg/link.svg?raw';
import i_home from 'pixelarticons/svg/home.svg?raw';
import i_book from 'pixelarticons/svg/book-open.svg?raw';
import i_calculator from 'pixelarticons/svg/calculator.svg?raw';
import i_gem from 'pixelarticons/svg/diamond-gem.svg?raw';
import i_bug from 'pixelarticons/svg/bug.svg?raw';
import i_clock from 'pixelarticons/svg/clock.svg?raw';
import i_shield from 'pixelarticons/svg/shield.svg?raw';
import i_settings from 'pixelarticons/svg/settings-cog.svg?raw';
import i_sliders from 'pixelarticons/svg/sliders.svg?raw';
import i_server from 'pixelarticons/svg/server.svg?raw';
import i_phone from 'pixelarticons/svg/phone.svg?raw';
import i_tablet from 'pixelarticons/svg/tablet.svg?raw';
import i_monitor from 'pixelarticons/svg/monitor.svg?raw';
import i_gamepad from 'pixelarticons/svg/gamepad.svg?raw';
import i_sun from 'pixelarticons/svg/sun.svg?raw';
import i_moon from 'pixelarticons/svg/moon.svg?raw';
import i_code from 'pixelarticons/svg/code.svg?raw';
import i_github from 'pixelarticons/svg/github.svg?raw';
import i_info from 'pixelarticons/svg/info-box.svg?raw';
import i_warning from 'pixelarticons/svg/warning-diamond.svg?raw';
import i_reload from 'pixelarticons/svg/reload.svg?raw';
import i_share from 'pixelarticons/svg/share.svg?raw';
import i_trash from 'pixelarticons/svg/trash.svg?raw';
import i_list from 'pixelarticons/svg/list-box.svg?raw';
import i_potion from 'pixelarticons/svg/potion.svg?raw';
import i_sword from 'pixelarticons/svg/sword.svg?raw';
import i_tools from 'pixelarticons/svg/tools.svg?raw';
import i_scale from 'pixelarticons/svg/scale.svg?raw';
import i_package from 'pixelarticons/svg/package.svg?raw';
import i_file from 'pixelarticons/svg/file-text.svg?raw';
import i_flag from 'pixelarticons/svg/flag.svg?raw';
import i_message from 'pixelarticons/svg/message-text.svg?raw';
import i_blocks from 'pixelarticons/svg/blocks.svg?raw';
import i_help from 'pixelarticons/svg/message-reply.svg?raw';
import i_eye from 'pixelarticons/svg/eye.svg?raw';
import i_heart from 'pixelarticons/svg/heart.svg?raw';
import i_cloud from 'pixelarticons/svg/cloud-server.svg?raw';
import i_globe from 'pixelarticons/svg/globe.svg?raw';
import i_plus from 'pixelarticons/svg/plus.svg?raw';
import i_minus from 'pixelarticons/svg/minus.svg?raw';
import i_expand from 'pixelarticons/svg/expand.svg?raw';

const raw = {
	'menu': i_menu,
	'close': i_close,
	'chevron-right': i_chevron_right,
	'chevron-left': i_chevron_left,
	'chevron-down': i_chevron_down,
	'chevron-up': i_chevron_up,
	'arrow-right': i_arrow_right,
	'arrow-left': i_arrow_left,
	'arrow-up': i_arrow_up,
	'download': i_download,
	'external': i_external,
	'copy': i_copy,
	'check': i_check,
	'search': i_search,
	'link': i_link,
	'home': i_home,
	'book': i_book,
	'calculator': i_calculator,
	'gem': i_gem,
	'bug': i_bug,
	'clock': i_clock,
	'shield': i_shield,
	'settings': i_settings,
	'sliders': i_sliders,
	'server': i_server,
	'phone': i_phone,
	'tablet': i_tablet,
	'monitor': i_monitor,
	'gamepad': i_gamepad,
	'sun': i_sun,
	'moon': i_moon,
	'code': i_code,
	'github': i_github,
	'info': i_info,
	'warning': i_warning,
	'reload': i_reload,
	'share': i_share,
	'trash': i_trash,
	'list': i_list,
	'potion': i_potion,
	'sword': i_sword,
	'tools': i_tools,
	'scale': i_scale,
	'package': i_package,
	'file': i_file,
	'flag': i_flag,
	'message': i_message,
	'blocks': i_blocks,
	'help': i_help,
	'eye': i_eye,
	'heart': i_heart,
	'cloud': i_cloud,
	'globe': i_globe,
	'plus': i_plus,
	'minus': i_minus,
	'expand': i_expand,
} as const;

export type IconName = keyof typeof raw;

/** inner SVG markup (paths) of each icon, without the outer <svg> element */
export const iconPaths: Record<IconName, string> = Object.fromEntries(
	Object.entries(raw).map(([name, svg]) => [name, svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()])
) as Record<IconName, string>;
