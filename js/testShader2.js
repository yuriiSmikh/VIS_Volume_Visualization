class TestShader2 extends Shader {
  constructor(dataTexture, volumeSize) {
    // fragment shader without filetype
    super("color_vert", "color_frag");

    this.setUniform("dataTexture", dataTexture);
    this.setUniform("volumeResolution", volumeSize);
  }
}
