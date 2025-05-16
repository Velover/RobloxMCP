class Builder {
	static Create() {
		return new Builder();
	}

	private timer_: CallbackTimer = new CallbackTimer();
	private auto_start_ = false;
	WithTimer(callback: (timer: CallbackTimer) => void) {
		callback(this.timer_);
		return this;
	}
	WithWaitTime(value: number) {
		this.timer_.WaitTime = value;
		return this;
	}
	WithOneShot(value: boolean) {
		this.timer_.OneShot = value;
		return this;
	}
	WithTimeOutCallback(callback: () => void) {
		this.timer_.SetCallback(callback);
		return this;
	}
	WithYieldAfterCall(value: boolean) {
		this.timer_.YieldAfterCall = value;
		return this;
	}
	WithTerminateOld(value: boolean) {
		this.timer_.TerminateOld = value;
		return this;
	}
	WithAutoStart() {
		this.auto_start_ = true;
		return this;
	}
	Build() {
		if (this.auto_start_) this.timer_.Start();
		return this.timer_;
	}
}

setmetatable(Builder, {
	__call: () => {
		return new Builder();
	},
});

type CallableBuilder = typeof Builder & { (): Builder };
export class CallbackTimer {
	static Builder = Builder as CallableBuilder;

	public WaitTime = 1;
	/**dont restart the timer til the callback is finished.
	 *
	 *Applied only if one_shot is false
	 */
	public YieldAfterCall = false;
	/**stops the previous callback if it's still running.
	 *
	 *Applied only if one_shot is false
	 */
	public TerminateOld = false;
	private start_time_ = 0;

	/**
	 * if one_shot if true, the timer will work only once and will stop
	 * if false timer works until the manual Stop()
	 * default is true
	 */
	public OneShot = true;

	private stopped_ = true;
	IsStopped() {
		return this.stopped_;
	}

	private thread_?: thread;
	private callback_thread_?: thread;
	private callback_: () => void = () => {};
	SetCallback(callback: () => void) {
		this.callback_ = callback;
		return this;
	}

	// private constructor() {}

	Start(time_sec = -1) {
		if (time_sec > 0) {
			this.WaitTime = time_sec;
		}
		//stops the existing timer
		this.Stop();

		this.start_time_ = os.clock();
		//takes stopped flag away
		this.stopped_ = false;
		this.thread_ = task.spawn(() => this.Cycle());
	}

	private TerminateCallbackThread() {
		if (this.callback_thread_ === undefined) return;
		task.cancel(this.callback_thread_);
		this.callback_thread_ = undefined;
	}

	private Cycle() {
		while (task.wait(this.WaitTime)) {
			if (this.TerminateOld) this.TerminateCallbackThread();
			if (this.YieldAfterCall) this.callback_();
			else this.callback_thread_ = task.spawn(this.callback_);
			if (this.OneShot) break;
		}
		//cannot stop the thread from inside;
		this.stopped_ = true;
	}

	/**
	 * way to stop the timer in timer callback
	 * @param terminate_callback whether to stop running callback defaults to false
	 * if called from the timer callback should be always false, its better to handle termination within the callback with return statement
	 *
	 * ```ts
	 * function TimerFunction()
	 * ...
	 *  if(something){
	 *   timer.StopInThread();
	 *   return;
	 *  }
	 * }
	 * ```
	 */
	StopInThread(terminate_callback: boolean = false) {
		this.stopped_ = true;
		if (terminate_callback) this.TerminateCallbackThread();
	}

	/**
	 * should not be called from the callback in the timer, can cause error!
	 * @param terminate_callback
	 */
	Stop(terminate_callback: boolean = false) {
		if (this.thread_ !== undefined) {
			task.cancel(this.thread_);
			this.thread_ = undefined;
		}
		if (terminate_callback) this.TerminateCallbackThread();

		this.stopped_ = true;
	}

	GetTimeLeft() {
		return math.max(this.WaitTime - (os.clock() - this.start_time_), 0);
	}

	Destroy() {
		this.Stop();
	}
}
