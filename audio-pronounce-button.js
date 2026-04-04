class AudioPronounceButton extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label") || "🔊 Pronounce";
    this.innerHTML = `<button type="button" class="speak-btn">${label}</button>`;

    this.button = this.querySelector("button");
    this.handleClick = this.speak.bind(this);
    this.button.addEventListener("click", this.handleClick);
  }

  disconnectedCallback() {
    if (this.button && this.handleClick) {
      this.button.removeEventListener("click", this.handleClick);
    }
  }

  speak() {
    const word = this.getAttribute("word");
    if (!word) {
      return;
    }

    const lang = this.getAttribute("lang") || "en-US";
    const rate = Number(this.getAttribute("rate") || "0.9");
    const pitch = Number(this.getAttribute("pitch") || "1.15");

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

customElements.define("audio-pronounce-button", AudioPronounceButton);
