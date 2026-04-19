class TestShader2 extends Shader {
  constructor(dataTexture, volumeSize, fragmentShader) { // fragment shader without filetype
    super("color_vert", fragmentShader);

    this.setUniform("dataTexture", dataTexture);
    this.setUniform("volumeSize", volumeSize);
  }
}
