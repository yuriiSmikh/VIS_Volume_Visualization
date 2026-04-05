class TestShader2 extends Shader {
  constructor(dataTexture, threshold, step, volumeSize, isoValue) {
    super("color_vert", "color_frag");

    this.setUniform("dataTexture", dataTexture);
    this.setUniform("threshold", threshold);
    this.setUniform("step", step);
    this.setUniform("volumeSize", volumeSize);
    this.setUniform("isoValue", isoValue);
  }
}
