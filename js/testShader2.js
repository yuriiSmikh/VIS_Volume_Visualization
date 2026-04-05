class TestShader2 extends Shader {
  constructor(dataTexture, volumeSize) {
    super("color_vert", "color_frag");

    this.setUniform("dataTexture", dataTexture);
    this.setUniform("volumeSize", volumeSize);
  }
}
