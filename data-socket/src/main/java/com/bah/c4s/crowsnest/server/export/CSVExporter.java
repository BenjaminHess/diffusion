package com.bah.c4s.crowsnest.server.export;

import org.json.simple.JSONObject;

public class CSVExporter {
  public static String export(JSONObject json){
    JSONObject returnJson = new JSONObject();
    // Prepare return
    returnJson.put("command", "DOWNLOAD_EXPORT");
    
    StringBuilder returnData = new StringBuilder();
    returnData.append("data:text/csv;charset=UTF-8,").append(json.get("fields"));
    
    returnJson.put("data", returnData.toString());
    System.out.println(returnJson.toJSONString());
    return returnJson.toJSONString();
  }
}
