package com.bah.c4s.crowsnest.action;

import java.util.ArrayList;
import java.util.List;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class ActionUtils {
   public static String SPACE = " ";
	
	
	public static boolean detailedExamine(JSONObject json, List<String> subFilters){
		for(String s : subFilters){
			boolean check = true;
			String parts[] = s.split(":");
			String checkValue = json.get(parts[0]).toString();
			switch(parts[1]){
			case "EQUALS": 
				check = checkValue.equals(parts[2]);
				break;
				
			case "CONTAINS":
				check = checkValue.contains(parts[2]);
				break;
				
			default: check = false;
			}
			if(!check){
				return false;
			}
		}
		return true;
	}
	public static String getPrimaryValue(List<String> subFilters, String field){
		for(String s : subFilters){
			String[] parts = s.split(":");
			if(parts[0].equals(field));
			return parts[2];
		}
		return null;
	}
	public static String detailedEntityDescription(List<String> subFilters){
		StringBuilder sb = new StringBuilder();
		for(String s : subFilters){
			String[] parts = s.split(":");
			sb.append(parts[0]).append(SPACE).append(parts[1].toLowerCase()).append(SPACE).append(parts[2]);
			sb.append(SPACE).append("and").append(SPACE);
		}
		sb.delete(sb.length() - 6, sb.length());
		return "";
	}
	public static String detailedEntity(List<String> subFilters){
		StringBuilder sb = new StringBuilder();
		for(String s : subFilters){
			String[] parts = s.split(":");
			sb.append(parts[2]).append(":");
		}
		sb.deleteCharAt(sb.length() - 1);
		return "";
	}
	public static ArrayList<String> getFilters(JSONObject json){	
		JSONArray filters = (JSONArray) json.get("filters");
		ArrayList<String> filterList = new ArrayList<String>();
		for (Object f : filters) {
			JSONObject subFilter = (JSONObject) f;
			StringBuilder sb = new StringBuilder();
			sb.append(subFilter.get("field").toString()).append(":");
			sb.append(subFilter.get("type").toString()).append(":");
			sb.append(subFilter.get("value").toString());
			filterList.add(sb.toString());
		}
		return filterList;
    }
}