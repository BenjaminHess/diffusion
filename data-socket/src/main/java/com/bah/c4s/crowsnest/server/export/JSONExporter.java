package com.bah.c4s.crowsnest.server.export;

public class JSONExporter {

  public static synchronized String export(String json){
    StringBuilder returnData = new StringBuilder();
    returnData.append("data:json;base64,");
    
    return returnData.toString();
  }
}
