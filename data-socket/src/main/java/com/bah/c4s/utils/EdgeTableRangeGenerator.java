package com.bah.c4s.utils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.accumulo.core.data.Range;

public class EdgeTableRangeGenerator {

  private static final int MAXIPOCTET = 255;
  private static final int MAXPORT = 65535;
  private static Pattern charPattern = Pattern.compile("[a-zA-Z]");

    private static Pattern ipPattern = Pattern.compile("^([01]?\\d\\d?|2[0-4]\\d|25[0-5])\\."
      + "([01]?\\d\\d?|2[0-4]\\d|25[0-5])\\." + "([01]?\\d\\d?|2[0-4]\\d|25[0-5])\\."
      + "([01]?\\d\\d?|2[0-4]\\d|25[0-5])$");
  
  public static List<Range> getEdgeRange(
      String type, String sDate, String eDate, String direction, 
      String host1, String host2, String host1Port, String host2Port) throws IllegalArgumentException, ParseException{
    
    List<Range> ranges = new LinkedList<Range>();
    
    if(type == null || sDate == null || eDate == null){
      throw new IllegalArgumentException("Arguements Type, Start Date & End Date must not be null");
    }
    
    List<String> rows = getTypes(type);
    rows = getDates(rows, sDate, eDate);
    
    rows = getDirection(rows, direction);
    
    List<String> domains = getDomains(host1);
    domains = mergeList(rows, domains);
    host1 = removeDomains(host1);

    if(!host1.equals("")){
      rows = getIP(rows, host1);
      if(!host2.equals("")){
        rows = getIP(rows, host2);
      }

      if(!host1Port.equals("")){
        rows = addPort(rows, host1Port);
      }

      if(!host2Port.equals("")){
        rows = addPort(rows, host2Port);
      }
      for(String row : rows){
        ranges.add(new Range(row, true, row+'~', false));
      }
    } 
    
    for(String domain : domains){
      ranges.add(new Range(domain, true, domain + '~', false));
    }
    
    return ranges;
  }
  
  private static List<String> getTypes(String type){
    LinkedList<String> outputRanges = new LinkedList<String>();
    for(String s : type.split(",")){
      outputRanges.add(s);
    }    
    return outputRanges;
  }

  private static String removeDomains(String param){
    StringBuilder sb = new StringBuilder();
    String[] hosts = param.split(",");
    for(String host : hosts){
      Matcher m = charPattern.matcher(host);
      if (!m.find()) {
        sb.append(host).append(",");
      }
    }
    if(sb.length() == 0){
      return "";
    }
    sb.deleteCharAt(sb.length() - 1);
    return sb.toString();
  }
  private static List<String> getDomains(String param){
    LinkedList<String> output = new LinkedList<String>();
    String[] hosts = param.split(",");
    for(String host : hosts){
      Matcher m = charPattern.matcher(host);
      if (m.find()) {
        output.add(new StringBuilder(host).reverse().toString());
      }
    }
    return output;
  }
  
  public static List<String> getDates(List<String> inputRanges, String sDateString, String eDateString) throws ParseException{
    SimpleDateFormat parserSDF = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss");
    SimpleDateFormat idSDF = new SimpleDateFormat("yyyyMMdd");
    LinkedList<String> dates = new LinkedList<String>();
    Date sDate = parserSDF.parse(sDateString);
    Date eDate = parserSDF.parse(eDateString);
    
    Calendar c = Calendar.getInstance();
    c.setTime(sDate);
    while(c.getTime().before(eDate)){
      dates.add(idSDF.format(c.getTime()));
      c.add(Calendar.DATE, 1);
    }
    return mergeList(inputRanges, dates);
  }
  
  private static  List<String> getDirection(List<String> inputRanges, String direction){
    if(direction.equals("Both")){
      direction = "To,From";
    } 
    return mergeList(inputRanges, new LinkedList<String>(Arrays.asList(direction.split(","))));
  }
  
  private static List<String> getIP(List<String> inputRanges, String ip){
    LinkedList<String> rawIPs = new LinkedList<String>(Arrays.asList(ip.split(",")));
    LinkedList<String> processedIPs = new LinkedList<String>();
    for(String s : rawIPs){
      String[] parts = s.split("\\.");
      LinkedList<String> ipParts = new LinkedList<String>();
      for(String p : parts){
        if(p.equals("*")){
          LinkedList<String> all = new LinkedList<String>();
          for(int i =0; i<= MAXIPOCTET; i++){
            all.add(String.valueOf(i));
          }
          ipParts = mergeList(ipParts, all,".");
        }else{
          String[] subParts = p.split(",");
          for(String subPart : subParts){
            if(subPart.contains("[")){           
              ipParts = (LinkedList<String>) mergeList(ipParts, getRange(subPart), ".");
            }
            else{
              ipParts = mergeString(ipParts, subPart, ".");
            }
          }
        }
      }
      processedIPs.addAll(ipParts);
    }
    LinkedList<String> processedZeroedIPs = new LinkedList<String>();
    for(String s : processedIPs){
    	processedZeroedIPs.add(zeroPadIP(s));
    }
    return mergeList(inputRanges, processedZeroedIPs);
  }
  
  private static List<String> addPort(List<String> inputRanges, String port){
    String[] parts = port.split(",");
    LinkedList<String> ports = new LinkedList<String>();
    for(String p : parts){
      if(p.equals("*")){
        for(int i =0; i<=MAXPORT; i++){
          ports.add(String.valueOf(i));
        }
      }else{
        if(p.contains("[")){           
          ports.addAll(getRange(p));
        }
        else{
          ports.add(p);
        }
      }
    }
    return mergeList(inputRanges, ports);
  }
  
  private static List<String> getRange(String block){
    block = block.replace("[","").replace("]", "");
    String[] ranges = block.split("-");
    Integer start = Integer.parseInt(ranges[0]);
    Integer end = Integer.parseInt(ranges[1]);
    LinkedList<String> all = new LinkedList<String>();
    for(int i = start; i <= end; i++){
      all.add(String.valueOf(i));
    }
    return all;
  }
  
  private static LinkedList<String> mergeString(List<String> left, String right, String join){
    LinkedList<String> merged = new LinkedList<String>();
    if(left.size() == 0){
    	merged.add(right);
    	return merged;
    }
    for(String l : left){
        merged.add(l + join + right);
    }
    return merged; 
  }
  
  private static LinkedList<String> mergeList(List<String> left, List<String> right, String join){
    LinkedList<String> merged = new LinkedList<String>();
    for(String l : left){
      for(String r : right){
        merged.add(l + join + r);
      }
    }
    return merged; 
  }
  
  private static List<String> mergeList(List<String> left, List<String> right){
    return mergeList(left, right, "_");
  }

  public static String zeroPadIP(String ip){
	  ip = ip.replaceAll("\\(", "");
	  ip = ip.replaceAll("\\)", "");
	  String parts[] = ip.split("\\.");
	  if(parts.length != 4){
		  return null;
	  }
	  StringBuilder sb = new StringBuilder();

	  for(String part : parts){
		  if(part.length() == 1){
			  sb.append("00");
		  }
		  if(part.length() == 2){
			  sb.append("0");
		  }
		  sb.append(part).append('.');
	  }
	  sb.deleteCharAt(sb.length()-1);

	  return sb.toString();
  }
}
