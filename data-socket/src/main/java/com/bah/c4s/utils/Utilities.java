package com.bah.c4s.utils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Utilities {
  private static final Logger LOG = LoggerFactory.getLogger(Utilities.class);

  public static Properties getConfig(String propFileName) {
    InputStream in = Utilities.class.getClassLoader().getResourceAsStream(propFileName);
    Properties result = new Properties();
    if (in != null) {
      try {
        result.load(in);
      } catch (IOException e) {
        LOG.error("failed to load properties: " + result);
      }
    } else {
      LOG.warn("Input Stream is null");
    }
    return result;
  }

}
