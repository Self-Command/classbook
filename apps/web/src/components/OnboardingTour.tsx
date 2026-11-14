import { useEffect, useRef } from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './OnboardingTour.css';
import { useAuth } from '@/lib/auth';

const ONBOARDED_PREFIX = 'classbook:onboarded:';
const SWARM_PLAY_EVENT = 'classbook:swarm-play';
const SWARM_FINISH_EVENT = 'classbook:swarm-finish';
const SWARM_FINISHED_EVENT = 'classbook:swarm-finished';
const FALLBACK_DELAY_MS = 9000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function isVisible(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * 首次登录引导：自动播放一次页面重建动画，动画结束后用 driver.js 高亮主要入口。
 * 只对已登录用户且浏览器首次访问该账号时触发，完成后写入 localStorage。
 */
export function OnboardingTour() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const startedRef = useRef(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (loading || !userId || startedRef.current) return;

    const storageKey = ONBOARDED_PREFIX + userId;
    try {
      if (window.localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }

    startedRef.current = true;

    let cancelled = false;
    let timer = 0;
    let finishTimer = 0;
    let tourTimer = 0;

    const markOnboarded = () => {
      try {
        window.localStorage.setItem(storageKey, '1');
      } catch {
        // 存储不可用时本次引导仍然有效，只是下次会再次出现。
      }
    };

    const steps: DriveStep[] = [];

    steps.push({
      popover: {
        title: '欢迎来到拾光同学录',
        description:
          '花 30 秒认识几个常用入口。这次引导只会在首次登录时出现一次，随时可以点右上角跳过。',
      },
    });

    if (isVisible('[data-tour="nav"]')) {
      steps.push({
        element: '[data-tour="nav"]',
        popover: {
          title: '主要导航',
          description:
            '广场可以发帖、评论、点赞和 @ 同学；相册存放班级照片；同学录里能找到每个人的档案。',
        },
      });
    }

    if (isVisible('[data-tour="bell"]')) {
      steps.push({
        element: '[data-tour="bell"]',
        popover: {
          title: '通知铃铛',
          description:
            '有人留言、评论、回复、点赞或 @ 你时，会在这里实时提醒。点开可以直达对应内容。',
        },
      });
    }

    if (isVisible('[data-tour="account"]')) {
      steps.push({
        element: '[data-tour="account"]',
        popover: {
          title: '你的账号',
          description:
            '在这里进入个人主页、修改资料，或者退出登录。',
        },
      });
    }

    if (isVisible('[data-tour="swarm-bar"]')) {
      steps.push({
        element: '[data-tour="swarm-bar"]',
        popover: {
          title: '重建动画',
          description:
            '这条常驻控制条可以随时点击「播放」重看页面重建动画；打开「自动」后每次切换页面都会自动播放。默认关闭。',
        },
      });
    }

    const startTour = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      window.clearTimeout(finishTimer);
      if (driverRef.current) return;
      driverRef.current = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgb(0 0 0 / 55%)',
        stagePadding: 6,
        stageRadius: 14,
        nextBtnText: '下一步',
        prevBtnText: '上一步',
        doneBtnText: '开始使用',
        progressText: '{{current}} / {{total}}',
        onDestroyed: () => {
          driverRef.current = null;
          markOnboarded();
        },
        steps,
      });
      driverRef.current.drive();
    };

    const onFinished = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      window.clearTimeout(finishTimer);
      tourTimer = window.setTimeout(startTour, 320);
    };

    window.addEventListener(SWARM_FINISHED_EVENT, onFinished, { once: true });

    if (prefersReducedMotion()) {
      timer = window.setTimeout(startTour, 600);
    } else {
      window.dispatchEvent(
        new CustomEvent(SWARM_PLAY_EVENT, { detail: { reason: 'first-login' } }),
      );
      // 首次登录的动画只演示一小段，随后自动收尾进入引导；用户提前点「完成」则立即进入。
      finishTimer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(SWARM_FINISH_EVENT));
      }, 6000);
      // 动画因异常没有结束时兜底进入引导，避免用户一直卡在等待状态。
      timer = window.setTimeout(startTour, FALLBACK_DELAY_MS);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(tourTimer);
      window.removeEventListener(SWARM_FINISHED_EVENT, onFinished);
      driverRef.current?.destroy();
    };
  }, [userId, loading]);

  return null;
}